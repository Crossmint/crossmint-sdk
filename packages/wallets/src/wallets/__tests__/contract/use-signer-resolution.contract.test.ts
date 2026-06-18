/**
 * CHARACTERIZATION (contract) tests for useSigner() signer resolution:
 * passkey auto-selection, input validation, requireSigner preconditions,
 * server signer derivation caching/secure-wipe, and recovery signer matching.
 *
 * These tests pin CURRENT behavior (exact error classes and message strings,
 * API call arguments, secure-wipe state effects, recovery upgrade/strip sequencing)
 * ahead of the wallet.ts service decomposition. If one of these fails after a
 * refactor, the refactor changed observable behavior.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallet";
import type { ApiClient } from "../../../api";
import type { Chain } from "../../../chains/chains";
import type { ApiSourcedServerSignerConfig, SignerConfigForChain } from "../../../signers/types";
import { createMockApiClient, type MockedApiClient } from "../test-helpers";
import { deriveServerSignerCandidates, assembleServerSigner } from "@/signers/server";

// Same module mock shape as wallet.test.ts — secureWipe stays REAL so the
// byte-zeroing assertions below exercise the actual wipe behavior.
vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerDetails: vi.fn().mockReturnValue({
            derivedKeyBytes: new Uint8Array(32),
            derivedAddress: "0xDerivedServerAddress",
        }),
        deriveServerSignerCandidates: vi.fn().mockReturnValue({
            primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xDerivedServerAddress" },
            legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyServerAddress" },
        }),
        assembleServerSigner: vi.fn().mockReturnValue({
            type: "server",
            locator: () => "server:0xDerivedServerAddress",
            address: () => "0xDerivedServerAddress",
            status: undefined,
            signMessage: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
            signTransaction: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
        }),
    };
});

const mockedCandidates = vi.mocked(deriveServerSignerCandidates);
const mockedAssemble = vi.mocked(assembleServerSigner);

const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";

// Subclass probe to invoke the signer-manager require() precondition check via the protected accessor.
class RequireSignerProbeWallet<C extends Chain> extends Wallet<C> {
    public probeRequireSigner() {
        return this.signerManager.require();
    }
}

const NOT_THROWN = Symbol("not thrown");

/** Asserts the promise rejects with a PLAIN Error whose message is EXACTLY `exactMessage`. */
async function expectExactPlainErrorRejection(promise: Promise<unknown>, exactMessage: string): Promise<void> {
    let caught: unknown = NOT_THROWN;
    try {
        await promise;
    } catch (e) {
        caught = e;
    }
    expect(caught).not.toBe(NOT_THROWN);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor).toBe(Error); // plain Error, not a subclass
    expect((caught as Error).message).toBe(exactMessage);
}

/** Synchronous variant for requireSigner(). */
function expectExactPlainErrorThrow(fn: () => unknown, exactMessage: string): void {
    let caught: unknown = NOT_THROWN;
    try {
        fn();
    } catch (e) {
        caught = e;
    }
    expect(caught).not.toBe(NOT_THROWN);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).constructor).toBe(Error);
    expect((caught as Error).message).toBe(exactMessage);
}

const isZeroed = (bytes: Uint8Array): boolean => bytes.every((b) => b === 0);

/** Fresh server-signer derivation candidates with distinctive non-zero key bytes. */
const makeCandidates = (primaryAddress: string, legacyAddress: string | null) => ({
    primary: { derivedKeyBytes: new Uint8Array(32).fill(7), derivedAddress: primaryAddress },
    legacy:
        legacyAddress == null ? null : { derivedKeyBytes: new Uint8Array(32).fill(9), derivedAddress: legacyAddress },
});

/** assembleServerSigner mock that reflects the resolved internal config (locator/address). */
const reflectiveAssembleServerSigner = () => {
    mockedAssemble.mockImplementation(
        (_chain: unknown, config: { locator: string; address: string }) =>
            ({
                type: "server",
                locator: () => config.locator,
                address: () => config.address,
                status: undefined,
                signMessage: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
                signTransaction: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
            }) as any
    );
};

const createWallet = <C extends Chain>(
    recovery: unknown,
    mockApiClient: MockedApiClient,
    extra: Record<string, unknown> = {},
    chain: C = "base-sepolia" as C
): Wallet<C> =>
    new Wallet(
        {
            chain,
            address: WALLET_ADDRESS,
            recovery: recovery as any,
            ...extra,
        },
        mockApiClient as unknown as ApiClient
    );

describe("contract: use-signer-resolution", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    describe("passkey auto-selection (tryAutoSelectPasskey)", () => {
        // pins wallet.ts tryAutoSelectPasskey: >1 registered passkeys short-circuits with guidance error
        it("useSigner passkey without id throws when multiple passkey signers are registered", async () => {
            // Recovery is also a passkey: proves the error fires BEFORE any recovery fallback.
            const wallet = createWallet({ type: "passkey" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "passkey", id: "cred-1", locator: "passkey:cred-1", status: "success" } as any,
                { type: "passkey", id: "cred-2", locator: "passkey:cred-2", status: "success" } as any,
            ]);
            mockApiClient.getSigner.mockClear();

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "passkey" } as SignerConfigForChain<"base-sepolia">),
                'Multiple passkey signers are registered on this wallet. Please specify the credential id: wallet.useSigner({ type: "passkey", id: "<credential-id>" })'
            );
            // Thrown before any registration (getSigner) check is performed
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        // pins wallet.ts resolveNonDeviceSigner: 0 passkeys + non-passkey recovery → error branch
        it("useSigner passkey without id throws 'No passkey signer is registered' when none registered and recovery is not passkey", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "passkey" } as SignerConfigForChain<"base-sepolia">),
                "No passkey signer is registered on this wallet."
            );
        });

        // pins wallet.ts tryAutoSelectPasskey: exactly 1 passkey → id mutated from locator (prefix stripped),
        // then treated as a registered delegated signer (getSigner called, status from API, not forced "active")
        it("useSigner passkey without id auto-selects the single registered passkey credential", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "passkey", id: "cred-123", locator: "passkey:cred-123", status: "success" } as any,
            ]);
            mockApiClient.getSigner.mockResolvedValue({
                type: "passkey",
                id: "cred-123",
                name: "My Passkey",
                publicKey: { x: "0x01", y: "0x02" },
                locator: "passkey:cred-123",
                chains: { "base-sepolia": { status: "awaiting-approval", id: "sig-passkey-1" } },
            } as any);

            const config = { type: "passkey" } as any;
            await wallet.useSigner(config);

            // The user-supplied config object is mutated in place with the "passkey:" prefix stripped
            expect(config.id).toBe("cred-123");
            // Delegated path: getSigner IS called with the wallet locator and the resolved passkey locator
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "passkey:cred-123");
            expect(wallet.signer?.type).toBe("passkey");
            expect(wallet.signer?.locator()).toBe("passkey:cred-123");
            // Status comes from the API response — NOT forced to "active" (not an admin signer)
            expect(wallet.signer?.status).toBe("awaiting-approval");
        });

        // pins wallet.ts isPasskeyMissingId: empty-string id is treated the same as a missing id
        it("useSigner passkey with empty-string id also auto-selects the single registered passkey", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "passkey", id: "cred-123", locator: "passkey:cred-123", status: "success" } as any,
            ]);
            mockApiClient.getSigner.mockResolvedValue({
                type: "passkey",
                id: "cred-123",
                locator: "passkey:cred-123",
                chains: { "base-sepolia": { status: "success", id: "sig-passkey-1" } },
            } as any);

            const config = { type: "passkey", id: "" } as any;
            await wallet.useSigner(config);

            expect(config.id).toBe("cred-123");
            expect(wallet.signer?.locator()).toBe("passkey:cred-123");
        });
    });

    describe("validateSignerInput", () => {
        // pins wallet.ts validateSignerInput: email branch — exact message, thrown before any API call
        it("useSigner rejects email signer configs missing the email with the exact message and no API calls", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "email" } as any),
                "Email signer requires an email address"
            );
            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "email", email: null } as any),
                "Email signer requires an email address"
            );
            // Validation happens before any registration or recovery API traffic
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        // pins wallet.ts validateSignerInput: phone branch — exact message, thrown before any API call
        it("useSigner rejects phone signer configs missing the phone with the exact message and no API calls", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "phone" } as any),
                "Phone signer requires a phone number"
            );
            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "phone", phone: null } as any),
                "Phone signer requires a phone number"
            );
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        // pins wallet.ts validateSignerInput: external-wallet address check fires before the onSign check
        it("useSigner rejects external-wallet configs missing the address (checked before onSign)", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "external-wallet" } as any),
                "External wallet signer requires a wallet address"
            );
            // Both address and onSign invalid → the ADDRESS message wins (ordering contract)
            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "external-wallet", onSign: "not-a-function" } as any),
                "External wallet signer requires a wallet address"
            );
        });

        // pins wallet.ts validateSignerInput: onSign must be a function (typeof check)
        it("useSigner rejects external-wallet configs whose onSign is missing or not a function", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "external-wallet", address: "0xAbc" } as any),
                "External wallet signer requires an onSign callback"
            );
            // A non-function onSign (e.g. a string) also fails the typeof check
            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "external-wallet", address: "0xAbc", onSign: "not-a-function" } as any),
                "External wallet signer requires an onSign callback"
            );
        });
    });

    describe("requireSigner delegates to SignerManager.require()", () => {
        it("forwards through the protected requireSigner seam, surfacing the manager's branch-ordered message", async () => {
            const wallet = new RequireSignerProbeWallet(
                {
                    chain: "base-sepolia",
                    address: WALLET_ADDRESS,
                    recovery: { type: "server", address: "0xRecoveryServer" } as any,
                    signers: [
                        { type: "email", email: "a@example.com" } as any,
                        { type: "phone", phone: "+15551234567" } as any,
                    ],
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();
            expect(wallet.signer).toBeUndefined();

            expectExactPlainErrorThrow(
                () => wallet.probeRequireSigner(),
                "No signer is set. This wallet has multiple signers configured. " +
                    "Call wallet.useSigner() to select which signer to use before signing operations."
            );
        });
    });

    describe("server signer cache wipe on useSigner re-entry", () => {
        beforeEach(() => {
            reflectiveAssembleServerSigner();
        });

        // pins wallet.ts useSigner entry: secureWipe(#resolvedServerSigner) + reset BEFORE re-resolution
        it("useSigner with server signer wipes and resets the previously resolved server signer cache before re-resolving", async () => {
            mockedCandidates.mockImplementation((signer: any) =>
                signer.secret === "secret-1"
                    ? (makeCandidates("0xAddrA", null) as any)
                    : (makeCandidates("0xAddrB", null) as any)
            );
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "server", address: "0xAddrA", locator: "server:0xAddrA", status: "success" } as any,
                { type: "server", address: "0xAddrB", locator: "server:0xAddrB", status: "success" } as any,
            ]);

            await wallet.useSigner({ type: "server", secret: "secret-1" } as any);
            // Call 0 = resolveServerSigner derivation for secret-1 → cached as #resolvedServerSigner
            const firstResolvedBytes = (mockedCandidates.mock.results[0]!.value as any).primary
                .derivedKeyBytes as Uint8Array;
            expect(wallet.signer?.address()).toBe("0xAddrA");
            expect(isZeroed(firstResolvedBytes)).toBe(false); // selected candidate kept intact for signing

            await wallet.useSigner({ type: "server", secret: "secret-2" } as any);
            // The previously cached delegated key bytes were securely zeroed on re-entry
            expect(isZeroed(firstResolvedBytes)).toBe(true);
            // And resolution re-ran from scratch with the new secret (no stale cache reuse)
            const secondResolvedBytes = (mockedCandidates.mock.results[2]!.value as any).primary
                .derivedKeyBytes as Uint8Array;
            expect(wallet.signer?.address()).toBe("0xAddrB");
            expect(isZeroed(secondResolvedBytes)).toBe(false);
        });

        // pins wallet.ts useSigner entry: #resolvedRecoveryServerSigner is intentionally NOT wiped/reset
        it("useSigner with a second server signer preserves the resolved recovery server signer cache", async () => {
            mockedCandidates.mockImplementation((signer: any) =>
                signer.secret === "recovery-secret"
                    ? (makeCandidates("0xRecAddr", null) as any)
                    : (makeCandidates("0xOtherAddr", null) as any)
            );
            const wallet = createWallet(
                { type: "server", address: "0xRecAddr" } as ApiSourcedServerSignerConfig,
                mockApiClient
            );
            await wallet.waitForInit();
            const signersSpy = vi.spyOn(wallet, "signers");
            signersSpy.mockResolvedValueOnce([]); // first useSigner → not delegated → recovery resolution
            signersSpy.mockResolvedValue([
                { type: "server", address: "0xOtherAddr", locator: "server:0xOtherAddr", status: "success" } as any,
            ]);

            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);
            // Call 0 = resolveServerSigner derivation → cached as #resolvedRecoveryServerSigner
            const recoveryBytes = (mockedCandidates.mock.results[0]!.value as any).primary
                .derivedKeyBytes as Uint8Array;
            expect(isZeroed(recoveryBytes)).toBe(false);

            // A subsequent useSigner with a DIFFERENT server secret (delegated) must not
            // wipe the recovery cache — it survives for withRecoverySigner usage.
            await wallet.useSigner({ type: "server", secret: "other-secret" } as any);
            expect(wallet.signer?.address()).toBe("0xOtherAddr");
            expect(isZeroed(recoveryBytes)).toBe(false);
            expect(wallet.recovery).toEqual({ type: "server", address: "0xRecAddr" });
        });
    });

    describe("resolveServerSigner not-registered error format and wipe", () => {
        beforeEach(() => {
            reflectiveAssembleServerSigner();
        });

        // pins wallet.ts resolveServerSigner: two-candidate error message + secureWipe before throwing
        it("not-registered error lists both derived locators and wipes both candidate key bytes", async () => {
            mockedCandidates.mockImplementation(() => makeCandidates("0xPrimaryAddr", "0xLegacyAddr") as any);
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "server", secret: "some-secret" } as any),
                'Signer "server:0xPrimaryAddr" or "server:0xLegacyAddr" is not registered in this wallet.'
            );
            const { primary, legacy } = mockedCandidates.mock.results[0]!.value as any;
            expect(isZeroed(primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(legacy.derivedKeyBytes)).toBe(true);
        });

        // pins wallet.ts resolveServerSigner: single-candidate error message when legacy == null
        it("not-registered error lists only the primary locator when no legacy candidate exists", async () => {
            mockedCandidates.mockImplementation(() => makeCandidates("0xPrimaryAddr", null) as any);
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "server", secret: "some-secret" } as any),
                'Signer "server:0xPrimaryAddr" is not registered in this wallet.'
            );
            const { primary } = mockedCandidates.mock.results[0]!.value as any;
            expect(isZeroed(primary.derivedKeyBytes)).toBe(true);
        });
    });

    describe("non-selected server candidate wiping", () => {
        beforeEach(() => {
            reflectiveAssembleServerSigner();
        });

        // pins wallet.ts resolveServerSigner delegated-primary branch + wipeNonSelectedCandidate
        it("wipes the legacy candidate and keeps the primary when the primary derivation is registered", async () => {
            mockedCandidates.mockImplementation(() => makeCandidates("0xPrimaryAddr", "0xLegacyAddr") as any);
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "server", address: "0xPrimaryAddr", locator: "server:0xPrimaryAddr", status: "success" } as any,
            ]);

            await wallet.useSigner({ type: "server", secret: "some-secret" } as any);

            const { primary, legacy } = mockedCandidates.mock.results[0]!.value as any;
            expect(isZeroed(legacy.derivedKeyBytes)).toBe(true); // non-selected → wiped
            expect(isZeroed(primary.derivedKeyBytes)).toBe(false); // selected → kept for signing
            expect(wallet.signer?.address()).toBe("0xPrimaryAddr");
        });

        // pins wallet.ts resolveServerSigner delegated-legacy branch + wipeNonSelectedCandidate
        it("wipes the primary candidate and keeps the legacy when the legacy derivation is registered", async () => {
            mockedCandidates.mockImplementation(() => makeCandidates("0xPrimaryAddr", "0xLegacyAddr") as any);
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "server", address: "0xLegacyAddr", locator: "server:0xLegacyAddr", status: "success" } as any,
            ]);

            await wallet.useSigner({ type: "server", secret: "some-secret" } as any);

            const { primary, legacy } = mockedCandidates.mock.results[0]!.value as any;
            expect(isZeroed(primary.derivedKeyBytes)).toBe(true); // non-selected → wiped
            expect(isZeroed(legacy.derivedKeyBytes)).toBe(false); // selected → kept for signing
            expect(wallet.signer?.address()).toBe("0xLegacyAddr");
        });

        // pins wallet.ts resolveServerSigner recovery branch + isRecoverySigner resolveAddresses wipe
        it("wipes the non-selected candidate during recovery resolution and zeroes the isRecoverySigner probe candidates", async () => {
            mockedCandidates.mockImplementation(() => makeCandidates("0xPrimaryAddr", "0xLegacyAddr") as any);
            // API-sourced recovery address matches the LEGACY derivation
            const wallet = createWallet(
                { type: "server", address: "0xLegacyAddr" } as ApiSourcedServerSignerConfig,
                mockApiClient
            );
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);

            // Call 0: resolveServerSigner candidates — legacy selected as recovery, primary wiped
            const first = mockedCandidates.mock.results[0]!.value as any;
            expect(isZeroed(first.primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(first.legacy.derivedKeyBytes)).toBe(false);
            // Call 1: isRecoverySigner's resolveAddresses derives candidates only to extract
            // addresses and wipes BOTH immediately (wallet.ts:1749)
            const probe = mockedCandidates.mock.results[1]!.value as any;
            expect(isZeroed(probe.primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(probe.legacy.derivedKeyBytes)).toBe(true);
            expect(wallet.signer?.address()).toBe("0xLegacyAddr");
        });
    });

    describe("stripSecretFromRecovery", () => {
        beforeEach(() => {
            reflectiveAssembleServerSigner();
        });

        // pins wallet.ts stripSecretFromRecovery: #recovery upgraded-then-stripped to address-only config
        it("useSigner with recovery server signer strips the plaintext secret from wallet.recovery", async () => {
            mockedCandidates.mockImplementation(() => makeCandidates("0xRecAddr", null) as any);
            const wallet = createWallet(
                { type: "server", address: "0xRecAddr" } as ApiSourcedServerSignerConfig,
                mockApiClient
            );
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);

            // Admin (recovery) signer: status forced to "active", no getSigner call
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
            // isRecoverySigner upgraded #recovery to the full config (with the secret);
            // stripSecretFromRecovery then replaced it with the address-only shape.
            expect(wallet.recovery).toEqual({ type: "server", address: "0xRecAddr" });
            expect("secret" in (wallet.recovery as object)).toBe(false);
        });
    });

    describe("recovery signer locator matching (isRecoverySigner)", () => {
        // pins wallet.ts isRecoverySigner locator comparison: same type but different locator → no match,
        // no #recovery upgrade, and the standard not-registered error
        it("useSigner rejects an email signer with same type but different locator than the email recovery signer", async () => {
            const wallet = createWallet({ type: "email", email: "admin@example.com" }, mockApiClient);
            await wallet.waitForInit();
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await expectExactPlainErrorRejection(
                wallet.useSigner({ type: "email", email: "other@example.com" } as any),
                'Signer "email:other@example.com" is not registered in this wallet.'
            );

            // #recovery was NOT upgraded to the mismatching config
            expect(wallet.recovery).toEqual({ type: "email", email: "admin@example.com" });

            // The true recovery signer still resolves as admin afterwards
            mockApiClient.getSigner.mockClear();
            await wallet.useSigner({ type: "email", email: "admin@example.com" } as any);
            expect(wallet.signer?.type).toBe("email");
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("isSignerApproved", () => {
        // pins wallet.ts isApprovedSignerStatus: "active" is accepted alongside "success"
        it("isSignerApproved returns true for 'active' chain status", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "email",
                email: "admin2@example.com",
                address: "0xAdmin2",
                locator: "email:admin2@example.com",
                chains: { "base-sepolia": { status: "active", id: "sig-active" } },
            } as any);

            await expect(wallet.isSignerApproved("email:admin2@example.com")).resolves.toBe(true);
        });

        // pins wallet.ts getSignerState: getSigner failures/error responses are swallowed → false, not a throw
        it("isSignerApproved returns false when getSigner rejects or returns an error response", async () => {
            const wallet = createWallet({ type: "api-key" }, mockApiClient);
            await wallet.waitForInit();

            mockApiClient.getSigner.mockRejectedValueOnce(new Error("network down"));
            await expect(wallet.isSignerApproved("email:broken@example.com")).resolves.toBe(false);

            mockApiClient.getSigner.mockResolvedValueOnce({ error: true, message: "Signer not found" } as any);
            await expect(wallet.isSignerApproved("email:missing@example.com")).resolves.toBe(false);
        });
    });
});
