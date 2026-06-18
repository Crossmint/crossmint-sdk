/**
 * CHARACTERIZATION (contract) tests for server-signer hygiene in Wallet:
 * secret stripping (#1911), the dual derivation caches (#resolvedServerSigner vs
 * #resolvedRecoveryServerSigner), secure-wipe ordering, derivation selection
 * heuristics, and the server:<derivedAddress> locators sent to the API.
 *
 * These tests pin CURRENT behavior (exact error message strings, API call
 * arguments, which Uint8Array instances get zero-filled and which never do)
 * ahead of the wallet.ts service decomposition. If one of these fails after a
 * refactor, the refactor changed observable behavior.
 *
 * The deriveServerSignerCandidates mock returns FRESH objects/buffers on every
 * call (matching the real helper) and records them, so each call site's wipe
 * behavior is individually observable. The assembleServerSigner mock builds its
 * adapter from the internal config it receives, so derivation-selection drift
 * is visible through wallet.signer as well as through the mock's call args.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { Wallet } from "../../wallet";
import type { ApiClient } from "../../../api";
import type { ApiSourcedServerSignerConfig } from "../../../signers/types";
import { deriveServerSignerCandidates, assembleServerSigner } from "@/signers/server";
import { secureWipe } from "../../../utils/secure-wipe";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";

vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerDetails: vi.fn(),
        deriveServerSignerCandidates: vi.fn(),
        assembleServerSigner: vi.fn(),
    };
});

const mockedCandidates = vi.mocked(deriveServerSignerCandidates);
const mockedAssemble = vi.mocked(assembleServerSigner);

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";

type CandidateSpec = { address: string; fill: number };
type RecordedCandidates = {
    primary: { derivedKeyBytes: Uint8Array; derivedAddress: string };
    legacy: { derivedKeyBytes: Uint8Array; derivedAddress: string } | null;
};

/**
 * Install a deriveServerSignerCandidates implementation that returns fresh
 * candidate objects (new Uint8Array instances) on every call, keyed by the
 * config's secret, and records every returned object for wipe inspection.
 */
const installCandidates = (
    bySecret: Record<string, { primary: CandidateSpec; legacy: CandidateSpec | null }>
): RecordedCandidates[] => {
    const recorded: RecordedCandidates[] = [];
    mockedCandidates.mockImplementation(((signer: { secret?: string }) => {
        const spec = bySecret[signer?.secret ?? ""];
        if (spec == null) {
            throw new Error(`test setup: no candidate spec for secret "${signer?.secret}"`);
        }
        const out: RecordedCandidates = {
            primary: {
                derivedKeyBytes: new Uint8Array(32).fill(spec.primary.fill),
                derivedAddress: spec.primary.address,
            },
            legacy:
                spec.legacy == null
                    ? null
                    : {
                          derivedKeyBytes: new Uint8Array(32).fill(spec.legacy.fill),
                          derivedAddress: spec.legacy.address,
                      },
        };
        recorded.push(out);
        return out;
    }) as any);
    return recorded;
};

const isZeroed = (buf: Uint8Array): boolean => buf.length > 0 && buf.every((b) => b === 0);
const everyByteIs = (buf: Uint8Array, value: number): boolean => buf.length === 32 && buf.every((b) => b === value);

/** Internal signer config captured from an assembleServerSigner call. */
const assembleConfigAt = (index: number): { locator: string; address: string; derivedKeyBytes: Uint8Array } =>
    mockedAssemble.mock.calls[index][1] as unknown as {
        locator: string;
        address: string;
        derivedKeyBytes: Uint8Array;
    };

// Asserts a promise rejects with an Error carrying EXACTLY this message (not just a substring).
const expectExactErrorRejection = async (promise: Promise<unknown>, exactMessage: string): Promise<void> => {
    const error = await promise.then(
        () => {
            throw new Error("expected promise to reject, but it resolved");
        },
        (e: unknown) => e
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(exactMessage);
};

const makeWallet = (mockApiClient: MockedApiClient, args: Record<string, unknown>): Wallet<"base-sepolia"> =>
    new Wallet(
        {
            chain: "base-sepolia" as const,
            address: EVM_ADDRESS,
            ...args,
        } as any,
        mockApiClient as unknown as ApiClient
    );

const serverRegisterResponse = (address: string) =>
    ({
        type: "server",
        address,
        locator: `server:${address}`,
        chains: { "base-sepolia": { id: "sig-server-reg", status: "success" } },
    }) as any;

const emailRegisterResponse = () =>
    ({
        type: "email",
        email: "new@example.com",
        address: "0xNewEmail",
        locator: "email:new@example.com",
        chains: { "base-sepolia": { id: "sig-new", status: "success" } },
    }) as any;

describe("contract: server-signer-hygiene", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        // Build the adapter from the internal config it receives so the resolved
        // derivation (address/locator) is observable through wallet.signer.
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
    });

    describe("stripSecretFromRecovery", () => {
        // pins wallet.ts stripSecretFromRecovery (1182-1194, invoked at 1156): after the recovery
        // server signer resolves, #recovery is replaced with an address-only config (#1911)
        it("useSigner with server recovery strips the secret from wallet.recovery leaving an address-only config", async () => {
            const recorded = installCandidates({
                "recovery-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 7 },
                    legacy: { address: "0xRecoveryLegacy", fill: 9 },
                },
            });
            // >1 initial signers so initDefaultSigner leaves the signer undefined (no auto-assembly noise)
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", secret: "recovery-secret" },
                signers: [
                    { type: "email", email: "a@example.com" },
                    { type: "phone", phone: "+15555550100" },
                ],
            });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            // Before resolution the recovery config still carries the plaintext secret
            expect("secret" in wallet.recovery).toBe(true);

            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);

            // The secret is gone; only the resolved derived address remains
            expect(wallet.recovery).toEqual({ type: "server", address: "0xRecoveryPrimary" });
            expect("secret" in wallet.recovery).toBe(false);
            // The address-only config points at the resolved derivation
            expect((wallet.recovery as ApiSourcedServerSignerConfig).address).toBe(recorded[0].primary.derivedAddress);
        });
    });

    describe("resolveServerSignerDerivation api-sourced guard", () => {
        // pins wallet.ts resolveServerSignerDerivation api-sourced branch (352-360): exact error
        // when no secret and no cached recovery resolution, reached via addSigner (810-812)
        it("addSigner with address-only server config and no cached recovery resolution throws 'Cannot resolve server signer derivation'", async () => {
            const wallet = makeWallet(mockApiClient, { recovery: { type: "api-key" } });

            await expectExactErrorRejection(
                wallet.addSigner({ type: "server", address: "0xSomeServerAddress" } as any),
                "Cannot resolve server signer derivation: no secret available and no cached recovery resolution. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first.'
            );

            // The throw happens during locator resolution, before any API interaction
            expect(mockApiClient.registerSigner).not.toHaveBeenCalled();
            expect(mockedCandidates).not.toHaveBeenCalled();
        });
    });

    describe("recovery cache survives the useSigner delegated-cache reset", () => {
        // pins wallet.ts useSigner reset block (1047-1053): #resolvedServerSigner is wiped+nulled
        // but #resolvedRecoveryServerSigner is preserved, so withRecoverySigner still works
        it("repeated useSigner with server signers preserves the cached recovery resolution so addSigner still works", async () => {
            installCandidates({
                "recovery-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 7 },
                    legacy: { address: "0xRecoveryLegacy", fill: 9 },
                },
                "delegated-secret": {
                    primary: { address: "0xDelegated", fill: 3 },
                    legacy: null,
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", address: "0xRecoveryPrimary" } as ApiSourcedServerSignerConfig,
            });
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "server", address: "0xDelegated", locator: "server:0xDelegated", status: "success" } as any,
            ]);

            // (1) Resolve the recovery server signer — caches #resolvedRecoveryServerSigner, strips secret
            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);
            expect(wallet.signer?.address()).toBe("0xRecoveryPrimary");

            // (2) Switch to a delegated server signer — the delegated-cache reset runs
            await wallet.useSigner({ type: "server", secret: "delegated-secret" } as any);
            expect(wallet.signer?.address()).toBe("0xDelegated");

            // (3) addSigner must still assemble the recovery signer from the preserved recovery cache
            // instead of throwing "Cannot assemble server signer: no secret available."
            mockApiClient.registerSigner.mockResolvedValue(emailRegisterResponse());
            const result = await wallet.addSigner({ type: "email", email: "new@example.com" } as any);
            expect(result.locator).toBe("email:new@example.com");
            expect(result.status).toBe("success");

            // The withRecoverySigner assembly (3rd assemble call) used the cached recovery derivation
            expect(mockedAssemble).toHaveBeenCalledTimes(3);
            const recoveryAssemblyConfig = assembleConfigAt(2);
            expect(recoveryAssemblyConfig.address).toBe("0xRecoveryPrimary");
            expect(recoveryAssemblyConfig.locator).toBe("server:0xRecoveryPrimary");
            expect(everyByteIs(recoveryAssemblyConfig.derivedKeyBytes, 7)).toBe(true);
        });
    });

    describe("recovery derivation selection (legacy vs primary)", () => {
        // pins wallet.ts resolveServerSigner recovery branch (1141-1158): legacy derivation is
        // cached and its key bytes flow into assembleServerSigner when the api recovery address matches legacy
        it("recovery resolution passes the legacy derivation's address and key bytes to assembleServerSigner", async () => {
            const recorded = installCandidates({
                "test-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 7 },
                    legacy: { address: "0xRecoveryLegacy", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", address: "0xRecoveryLegacy" } as ApiSourcedServerSignerConfig,
            });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "test-secret" } as any);

            // assembleServerSigner received the LEGACY derivation: address, locator, and key bytes
            const config = assembleConfigAt(0);
            expect(config.address).toBe("0xRecoveryLegacy");
            expect(config.locator).toBe("server:0xRecoveryLegacy");
            expect(everyByteIs(config.derivedKeyBytes, 9)).toBe(true);
            expect(wallet.signer?.address()).toBe("0xRecoveryLegacy");

            // The losing primary candidate was wiped; the cached legacy candidate was NOT
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
            expect(everyByteIs(recorded[0].legacy!.derivedKeyBytes, 9)).toBe(true);
        });

        // pins wallet.ts resolveServerSigner recovery branch (1152-1154): primary derivation is
        // cached (and legacy wiped) when the api recovery address does not match legacy
        it("recovery resolution passes the primary derivation's address and key bytes to assembleServerSigner", async () => {
            const recorded = installCandidates({
                "test-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 7 },
                    legacy: { address: "0xRecoveryLegacy", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", address: "0xRecoveryPrimary" } as ApiSourcedServerSignerConfig,
            });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "test-secret" } as any);

            // assembleServerSigner received the PRIMARY derivation
            const config = assembleConfigAt(0);
            expect(config.address).toBe("0xRecoveryPrimary");
            expect(config.locator).toBe("server:0xRecoveryPrimary");
            expect(everyByteIs(config.derivedKeyBytes, 7)).toBe(true);
            expect(wallet.signer?.address()).toBe("0xRecoveryPrimary");

            // The losing legacy candidate was wiped; the cached primary candidate was NOT
            expect(isZeroed(recorded[0].legacy!.derivedKeyBytes)).toBe(true);
            expect(everyByteIs(recorded[0].primary.derivedKeyBytes, 7)).toBe(true);
        });
    });

    describe("buildInternalSignerConfig server key bytes copy semantics", () => {
        // pins wallet.ts buildInternalSignerConfig server case (1944-1958): derivedKeyBytes is a
        // fresh COPY of the cached derivation, taken before any wipe, so repeated assemblies work
        it("server internal signer config carries a fresh copy of key bytes and the cached resolution stays usable across repeated assemblies", async () => {
            const recorded = installCandidates({
                "recovery-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 7 },
                    legacy: { address: "0xRecoveryLegacy", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", address: "0xRecoveryPrimary" } as ApiSourcedServerSignerConfig,
            });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);

            const cachedBytes = recorded[0].primary.derivedKeyBytes;
            const firstConfig = assembleConfigAt(0);

            // (a) distinct instance, (b) identical non-zero content
            expect(firstConfig.derivedKeyBytes).not.toBe(cachedBytes);
            expect(Array.from(firstConfig.derivedKeyBytes)).toEqual(Array.from(cachedBytes));
            expect(everyByteIs(firstConfig.derivedKeyBytes, 7)).toBe(true);

            // (c) the adapter wiping ITS copy must not corrupt the cache...
            firstConfig.derivedKeyBytes.fill(0);
            expect(everyByteIs(cachedBytes, 7)).toBe(true);

            // ...so a second assembly from the same cache (withRecoverySigner during addSigner)
            // still receives usable, non-zero key bytes in yet another fresh copy
            mockApiClient.registerSigner.mockResolvedValue(emailRegisterResponse());
            await wallet.addSigner({ type: "email", email: "new@example.com" } as any);

            expect(mockedAssemble).toHaveBeenCalledTimes(2);
            const secondConfig = assembleConfigAt(1);
            expect(secondConfig.derivedKeyBytes).not.toBe(cachedBytes);
            expect(secondConfig.derivedKeyBytes).not.toBe(firstConfig.derivedKeyBytes);
            expect(everyByteIs(secondConfig.derivedKeyBytes, 7)).toBe(true);
        });
    });

    describe("buildInternalSignerConfig wipes non-cached derivations only", () => {
        // pins wallet.ts buildInternalSignerConfig server case (1950-1951): a derivation that is
        // not one of the two cache slots is wiped after copying; cached slots are never wiped
        it("buildInternalSignerConfig wipes a non-cached server derivation after copying but never wipes cached resolutions", async () => {
            // Direction 1: auto-assembly of a full-secret server recovery produces a FRESH primary
            // derivation that is not cached — it must be zero-filled after the copy is taken.
            const recordedAuto = installCandidates({
                "auto-secret": {
                    primary: { address: "0xAutoPrimary", fill: 7 },
                    legacy: { address: "0xAutoLegacy", fill: 9 },
                },
            });
            const autoWallet = makeWallet(mockApiClient, {
                recovery: { type: "server", secret: "auto-secret" },
            });
            await autoWallet.waitForInit();

            expect(autoWallet.signer?.address()).toBe("0xAutoPrimary");
            expect(recordedAuto).toHaveLength(1);
            // Non-cached selected derivation: wiped after the copy
            expect(isZeroed(recordedAuto[0].primary.derivedKeyBytes)).toBe(true);
            // Losing legacy candidate: wiped by the selection heuristic
            expect(isZeroed(recordedAuto[0].legacy!.derivedKeyBytes)).toBe(true);
            // The copy handed to the adapter was taken BEFORE the wipe
            expect(everyByteIs(assembleConfigAt(0).derivedKeyBytes, 7)).toBe(true);

            // Direction 2: a derivation that IS the recovery cache slot must never be wiped.
            const apiClient2 = createMockApiClient();
            const recordedCached = installCandidates({
                "recovery-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 5 },
                    legacy: null,
                },
            });
            const cachedWallet = makeWallet(apiClient2, {
                recovery: { type: "server", address: "0xRecoveryPrimary" } as ApiSourcedServerSignerConfig,
            });
            vi.spyOn(cachedWallet, "signers").mockResolvedValue([]);

            await cachedWallet.useSigner({ type: "server", secret: "recovery-secret" } as any);

            // The cached recovery derivation survives its own assembly intact
            expect(everyByteIs(recordedCached[0].primary.derivedKeyBytes, 5)).toBe(true);
        });
    });

    describe("unregistered server signer error", () => {
        // pins wallet.ts resolveServerSigner failure path (1160-1165): dual-locator message format
        // and the secure wipe of BOTH candidates before throwing
        it("unregistered server signer throws the dual-locator message and zeroes both candidate key buffers", async () => {
            const recorded = installCandidates({
                "unregistered-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: { address: "0xLegacyAddr", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, { recovery: { type: "api-key" } });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await expectExactErrorRejection(
                wallet.useSigner({ type: "server", secret: "unregistered-secret" } as any),
                'Signer "server:0xPrimaryAddr" or "server:0xLegacyAddr" is not registered in this wallet.'
            );

            // Both candidates' key material was zero-filled on the error path (#1911 hygiene)
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(recorded[0].legacy!.derivedKeyBytes)).toBe(true);
        });

        // pins wallet.ts resolveServerSigner failure path (1160-1163): single-locator message
        // variant when there is no legacy candidate
        it("unregistered server signer with no legacy candidate throws the single-locator message and zeroes the primary buffer", async () => {
            const recorded = installCandidates({
                "unregistered-secret": {
                    primary: { address: "0xOnlyPrimary", fill: 7 },
                    legacy: null,
                },
            });
            const wallet = makeWallet(mockApiClient, { recovery: { type: "api-key" } });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await expectExactErrorRejection(
                wallet.useSigner({ type: "server", secret: "unregistered-secret" } as any),
                'Signer "server:0xOnlyPrimary" is not registered in this wallet.'
            );

            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
        });
    });

    describe("derivation cache hit on re-derivation", () => {
        // pins wallet.ts resolveServerSignerDerivation cache-hit branch (364-372): both fresh
        // candidates are wiped and the cached resolution drives the API locator
        it("cache-hit derivation resolution returns the cached signer and zeroes both freshly derived candidates", async () => {
            const recorded = installCandidates({
                "recovery-secret": {
                    primary: { address: "0xRecoveryPrimary", fill: 7 },
                    legacy: { address: "0xRecoveryLegacy", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", address: "0xRecoveryPrimary" } as ApiSourcedServerSignerConfig,
            });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            await wallet.useSigner({ type: "server", secret: "recovery-secret" } as any);
            const cachedBytes = recorded[0].primary.derivedKeyBytes;
            const freshIndex = recorded.length;

            // addSigner re-derives candidates for the same secret — the cache must win
            mockApiClient.registerSigner.mockResolvedValue(serverRegisterResponse("0xRecoveryPrimary"));
            await wallet.addSigner({ type: "server", secret: "recovery-secret" } as any);

            // Exactly one fresh derivation happened during addSigner, and BOTH of its candidates were wiped
            expect(recorded.length).toBe(freshIndex + 1);
            const fresh = recorded[freshIndex];
            expect(isZeroed(fresh.primary.derivedKeyBytes)).toBe(true);
            expect(isZeroed(fresh.legacy!.derivedKeyBytes)).toBe(true);

            // The cached resolution was returned (its address drives the registered locator) and never wiped
            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({ signer: "server:0xRecoveryPrimary", chain: "base-sepolia" })
            );
            expect(everyByteIs(cachedBytes, 7)).toBe(true);
        });
    });

    describe("no-cache legacy selection heuristic (resolveServerSignerDerivation)", () => {
        // pins wallet.ts resolveServerSignerDerivation heuristic (380-389): legacy wins when its
        // address is in #apiDelegatedServerSignerAddresses, and the primary candidate is wiped
        it("addSigner picks the legacy derivation when it matches a known delegated server address and wipes the primary candidate", async () => {
            const recorded = installCandidates({
                "server-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: { address: "0xLegacyAddr", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "api-key" },
                apiDelegatedServerSignerAddresses: ["0xLegacyAddr"],
            });
            mockApiClient.registerSigner.mockResolvedValue(serverRegisterResponse("0xLegacyAddr"));

            await wallet.addSigner({ type: "server", secret: "server-secret" } as any);

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({ signer: "server:0xLegacyAddr", chain: "base-sepolia" })
            );
            // Loser (primary) is wiped.
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
            // NOTE: suspected bug — the SELECTED candidate's key bytes are returned for locator
            // resolution only, never cached and never wiped, so they linger in memory until GC.
            // Pinning current behavior: legacy bytes remain intact.
            expect(everyByteIs(recorded[0].legacy!.derivedKeyBytes, 9)).toBe(true);
        });

        // pins wallet.ts resolveServerSignerDerivation heuristic (381-384): legacy wins when it
        // matches an api-sourced server entry in #initialSigners
        it("addSigner picks the legacy derivation when it matches an api-sourced server entry in the initial signers", async () => {
            const recorded = installCandidates({
                "server-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: { address: "0xLegacyAddr", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "api-key" },
                signers: [{ type: "server", address: "0xLegacyAddr" }],
            });
            mockApiClient.registerSigner.mockResolvedValue(serverRegisterResponse("0xLegacyAddr"));

            await wallet.addSigner({ type: "server", secret: "server-secret" } as any);

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({ signer: "server:0xLegacyAddr", chain: "base-sepolia" })
            );
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
        });

        // pins wallet.ts resolveServerSignerDerivation heuristic (376-379): legacy wins when it
        // matches #apiRecoveryServerSignerAddress
        it("addSigner picks the legacy derivation when it matches the api recovery server signer address", async () => {
            const recorded = installCandidates({
                "server-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: { address: "0xLegacyAddr", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "api-key" },
                apiRecoveryServerSignerAddress: "0xLegacyAddr",
            });
            mockApiClient.registerSigner.mockResolvedValue(serverRegisterResponse("0xLegacyAddr"));

            await wallet.addSigner({ type: "server", secret: "server-secret" } as any);

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({ signer: "server:0xLegacyAddr", chain: "base-sepolia" })
            );
            expect(isZeroed(recorded[0].primary.derivedKeyBytes)).toBe(true);
        });
    });

    describe("server:<derivedAddress> locator in API call arguments", () => {
        // pins wallet.ts send signer resolution (677-683 via resolveServerSignerApiLocator 398-400):
        // a server signer config in send options becomes a server:<derivedAddress> locator string
        it("send with a server signer config passes server:<derivedAddress> to apiClient.send", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
            installCandidates({
                "server-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: null,
                },
            });
            mockApiClient.send.mockResolvedValue({ id: "txn-1" } as any);

            const result = await wallet.send("0x1111111111111111111111111111111111111111", "usdc", "10.0", {
                signer: { type: "server", secret: "server-secret" },
                prepareOnly: true,
            } as any);

            expect(result.transactionId).toBe("txn-1");
            expect(mockApiClient.send).toHaveBeenCalledWith("me:evm:smart", "base-sepolia:usdc", {
                recipient: "0x1111111111111111111111111111111111111111",
                amount: "10.0",
                signer: "server:0xPrimaryAddr",
            });
        });

        // pins wallet.ts addSigner server config resolution (810-812) and the no-match heuristic
        // fallthrough (390-392): primary is registered, the losing legacy candidate is wiped
        it("addSigner with a full-secret server config passes server:<derivedAddress> to apiClient.registerSigner", async () => {
            const recorded = installCandidates({
                "server-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: { address: "0xLegacyAddr", fill: 9 },
                },
            });
            const wallet = makeWallet(mockApiClient, { recovery: { type: "api-key" } });
            mockApiClient.registerSigner.mockResolvedValue(serverRegisterResponse("0xPrimaryAddr"));

            const result = await wallet.addSigner({ type: "server", secret: "server-secret" } as any);

            expect(mockApiClient.registerSigner).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({ signer: "server:0xPrimaryAddr", chain: "base-sepolia" })
            );
            expect(result.locator).toBe("server:0xPrimaryAddr");
            // No heuristic match: legacy is wiped and primary is selected
            expect(isZeroed(recorded[0].legacy!.derivedKeyBytes)).toBe(true);
            expect(everyByteIs(recorded[0].primary.derivedKeyBytes, 7)).toBe(true);
        });
    });

    describe("useSigner reset wipes the previous delegated cache", () => {
        // pins wallet.ts useSigner reset block (1050-1053): the previously cached delegated
        // server key buffer is zero-filled before the slot is nulled
        it("useSigner with a new server signer zeroes the previously cached delegated server key bytes", async () => {
            const recorded = installCandidates({
                "secret-a": { primary: { address: "0xDelegatedA", fill: 5 }, legacy: null },
                "secret-b": { primary: { address: "0xDelegatedB", fill: 6 }, legacy: null },
            });
            const wallet = makeWallet(mockApiClient, { recovery: { type: "api-key" } });
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "server", address: "0xDelegatedA", locator: "server:0xDelegatedA", status: "success" } as any,
                { type: "server", address: "0xDelegatedB", locator: "server:0xDelegatedB", status: "success" } as any,
            ]);

            await wallet.useSigner({ type: "server", secret: "secret-a" } as any);
            const cachedABytes = recorded[0].primary.derivedKeyBytes;
            // The delegated cache holds live (non-zero) key material after the first useSigner
            expect(everyByteIs(cachedABytes, 5)).toBe(true);

            await wallet.useSigner({ type: "server", secret: "secret-b" } as any);

            // The old delegated cache buffer was zero-filled by the reset
            expect(isZeroed(cachedABytes)).toBe(true);
            expect(wallet.signer?.address()).toBe("0xDelegatedB");
        });
    });

    describe("secureWipe util", () => {
        // pins utils/secure-wipe.ts secureWipe (5-11): zero-fills every buffer in place
        it("zero-fills every provided buffer in place", () => {
            const a = new Uint8Array([1, 2, 3, 4]);
            const b = new Uint8Array(32).fill(255);
            const aRef = a;

            secureWipe(a, b);

            expect(Array.from(a)).toEqual([0, 0, 0, 0]);
            expect(isZeroed(b)).toBe(true);
            // Mutated in place — same instance, not reassigned
            expect(a).toBe(aRef);
        });

        // pins utils/secure-wipe.ts secureWipe (7): null/undefined entries are silently skipped
        it("silently skips null and undefined entries", () => {
            const buf = new Uint8Array([9, 9]);

            expect(() => secureWipe(null, undefined, buf)).not.toThrow();
            expect(Array.from(buf)).toEqual([0, 0]);
            expect(() => secureWipe()).not.toThrow();
        });
    });

    describe("isAutoAssemblableSignerConfig server arm gating", () => {
        // pins wallet.ts isAutoAssemblableSignerConfig server arm (1980-1981) via initDefaultSigner
        // (260-262): api-sourced server recovery without a cached resolution cannot auto-assemble
        it("initDefaultSigner leaves wallet.signer undefined for api-sourced server recovery with no cached resolution", async () => {
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", address: "0xRecoveryPrimary" } as ApiSourcedServerSignerConfig,
            });

            await wallet.waitForInit();

            expect(wallet.signer).toBeUndefined();
            // No derivation or assembly was even attempted
            expect(mockedCandidates).not.toHaveBeenCalled();
            expect(mockedAssemble).not.toHaveBeenCalled();
        });

        // pins wallet.ts isAutoAssemblableSignerConfig server arm (1980-1981) via initDefaultSigner
        // (264-267): full-secret server recovery auto-assembles an admin signer without useSigner
        it("initDefaultSigner auto-assembles a server admin signer for full-secret server recovery", async () => {
            installCandidates({
                "auto-secret": {
                    primary: { address: "0xAutoPrimary", fill: 7 },
                    legacy: null,
                },
            });
            const wallet = makeWallet(mockApiClient, {
                recovery: { type: "server", secret: "auto-secret" },
            });

            await wallet.waitForInit();

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("server");
            expect(wallet.signer?.address()).toBe("0xAutoPrimary");
            // Admin signers are marked active without a getSigner API round-trip
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("deriveServerSignerCandidates wiring", () => {
        // pins wallet.ts deriveServerSignerCandidates (334-341): forwards
        // (signer, chain, projectId, environment) — in that order — to the helper
        it("wallet derives server signer candidates with chain, projectId, and environment from the api client", async () => {
            installCandidates({
                "wiring-secret": {
                    primary: { address: "0xPrimaryAddr", fill: 7 },
                    legacy: null,
                },
            });
            (mockApiClient as any).projectId = "proj_test_123";
            const wallet = makeWallet(mockApiClient, { recovery: { type: "api-key" } });
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { type: "server", address: "0xPrimaryAddr", locator: "server:0xPrimaryAddr", status: "success" } as any,
            ]);

            await wallet.useSigner({ type: "server", secret: "wiring-secret" } as any);

            expect(mockedCandidates).toHaveBeenNthCalledWith(
                1,
                { type: "server", secret: "wiring-secret" },
                "base-sepolia",
                "proj_test_123",
                APIKeyEnvironmentPrefix.STAGING
            );
        });
    });
});
