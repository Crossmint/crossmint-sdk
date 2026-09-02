import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@crossmint/common-sdk-base";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type {
    RecoverySignerConfigForChain,
    SignerAdapter,
    SignerConfigForChain,
    SignerLocator,
} from "../../signers/types";
import type { ServerSignerResolver } from "../../signers/server/resolver";
import { InvalidRecoveryConfigError } from "../../utils/errors";
import type { WalletOptions } from "../types";
import { SignerManager, type SignerManagerParams } from "./signer-manager";
import { assembleSigner } from "../../signers";
import { walletsLogger } from "../../logger";

vi.mock("../../signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../signers")>();
    return { ...actual, assembleSigner: vi.fn() };
});

const mockedAssembleSigner = vi.mocked(assembleSigner);
const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const NULL_SIGNER_STATE = { response: null, signer: null, pendingOperation: null };

const asRecoveryConfig = (config: unknown) => config as RecoverySignerConfigForChain<Chain>;
type Overrides = Partial<SignerManagerParams<Chain>>;

function makeSigner(tag: string): SignerAdapter {
    return { locator: () => `api-key:${tag}` as SignerLocator, status: undefined } as unknown as SignerAdapter;
}

function makeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
    return { crossmint: {}, getSigner: vi.fn(), ...overrides } as unknown as ApiClient;
}

function makeResolver(overrides: { resolvedRecoveryAddresses?: string[] } = {}): ServerSignerResolver {
    const resolved = overrides.resolvedRecoveryAddresses ?? [];
    return {
        hasRecoveryResolutionFor: (address: string) => resolved.includes(address),
    } as unknown as ServerSignerResolver;
}

function makeManager<C extends Chain>(
    overrides: Partial<SignerManagerParams<C>> = {},
    chain: C = "base-sepolia" as C
): SignerManager<C> {
    return new SignerManager<C>({
        apiClient: makeApiClient(),
        options: undefined as WalletOptions | undefined,
        chain,
        walletAddress: WALLET_ADDRESS,
        walletLocator: () => WALLET_ADDRESS,
        serverSignerResolver: makeResolver(),
        recoverySigners: [{ type: "api-key" } as RecoverySignerConfigForChain<C>],
        initialSigners: [],
        signers: async () => [],
        ...overrides,
    });
}

// Asserts the call throws an Error whose message matches a stable keyword for that branch. We match a
// keyword rather than the full string so copy edits to the guidance text don't break the test — only a
// real change of which branch fires does. The exact wording is pinned in the characterization suite.
async function expectThrowsMatching(run: () => unknown, branchKeyword: RegExp): Promise<void> {
    await expect(async () => await run()).rejects.toThrow(branchKeyword);
}

const apiKeyConfig = { type: "api-key" } as const;

beforeEach(() => {
    vi.clearAllMocks();
    walletsLogger.warn = vi.fn();
    walletsLogger.error = vi.fn();
});

describe("SignerManager", () => {
    it("require() returns the active signer when one is set", () => {
        const signer = makeSigner("active");
        expect(makeManager({ signer }).require()).toBe(signer);
    });

    it.each([
        [
            "multiple configured signers",
            { initialSigners: [apiKeyConfig, apiKeyConfig] },
            /multiple signers configured/,
        ],
        ["a server recovery signer", { recoverySigners: [{ type: "server", address: "0xServer" }] }, /server secret/],
        [
            "an external-wallet recovery signer",
            { recoverySigners: [asRecoveryConfig({ type: "external-wallet", address: "0xExt" })] },
            /External wallet signers require/,
        ],
        [
            "a non-auto-assemblable recovery signer",
            { recoverySigners: [asRecoveryConfig({ type: "device" })] },
            /requires calling wallet\.useSigner\(\)/,
        ],
        ["a read-only wallet", { recoverySigners: [apiKeyConfig] }, /read-only/],
    ] as const)("require() with no active signer reports %s", async (_name, overrides, branchKeyword) => {
        await expectThrowsMatching(() => makeManager(overrides as unknown as Overrides).require(), branchKeyword);
    });

    it.each([
        ["success", true],
        ["active", true],
        ["pending", false],
        [undefined, false],
    ])("isApprovedSignerStatus(%s) -> %s", (status, expected) => {
        expect(makeManager().isApprovedSignerStatus(status as never)).toBe(expected);
    });

    it.each([true, false])(
        "withRecoverySigner() swaps to the recovery signer then restores the original (operation succeeds=%s)",
        async (succeeds) => {
            const original = makeSigner("original");
            const recoverySigner = makeSigner("recovery");
            mockedAssembleSigner.mockReturnValue(recoverySigner);
            const manager = makeManager({ signer: original, recoverySigners: [{ type: "api-key" }] });
            const failure = new Error("operation failed");
            let signerDuringOperation: SignerAdapter | undefined;

            const run = manager.withRecoverySigner(() => {
                signerDuringOperation = manager.activeSigner;
                return succeeds ? Promise.resolve("ok") : Promise.reject(failure);
            });

            if (succeeds) {
                expect(await run).toBe("ok");
            } else {
                await expect(run).rejects.toBe(failure);
            }
            expect(signerDuringOperation).toBe(recoverySigner);
            expect(manager.activeSigner).toBe(original);
        }
    );

    it.each([
        [
            "the recovery server secret is unavailable",
            {
                recoverySigners: [{ type: "server", address: "0xServer" }],
                serverSignerResolver: makeResolver({ resolvedRecoveryAddresses: ["0xOtherServer"] }),
            },
            /Cannot assemble server signer/,
        ],
        [
            "the recovery external wallet has no onSign callback",
            { recoverySigners: [asRecoveryConfig({ type: "external-wallet", address: "0xExt" })] },
            /Cannot assemble external wallet signer/,
        ],
    ] as const)("withRecoverySigner() throws when %s", async (_name, overrides, branchKeyword) => {
        await expectThrowsMatching(
            () => makeManager(overrides as unknown as Overrides).withRecoverySigner(async () => "unused"),
            branchKeyword
        );
    });

    it("constructor rejects an empty recovery signer list", () => {
        expect(() => makeManager({ recoverySigners: [] })).toThrow(InvalidRecoveryConfigError);
    });

    it("recovery is the first entry of recoverySigners", () => {
        const primary = asRecoveryConfig({ type: "external-wallet", address: "0xPrimary" });
        const secondary = asRecoveryConfig({ type: "server", address: "0xSecondary" });
        const manager = makeManager({ recoverySigners: [primary, secondary] });
        expect(manager.recovery).toBe(primary);
        expect(manager.recoverySigners).toEqual([primary, secondary]);
    });

    it("recoverySigners returns a copy that does not expose internal state", () => {
        const manager = makeManager({ recoverySigners: [apiKeyConfig] });
        manager.recoverySigners.push(asRecoveryConfig({ type: "device" }));
        expect(manager.recoverySigners).toEqual([apiKeyConfig]);
    });

    it("adoptRecoveryConfig() replaces only the entry at the given index", () => {
        const primary = asRecoveryConfig({ type: "external-wallet", address: "0xPrimary" });
        const secondary = asRecoveryConfig({ type: "external-wallet", address: "0xSecondary" });
        const adopted = {
            type: "external-wallet",
            address: "0xSecondary",
            onSign: vi.fn(),
        } as SignerConfigForChain<Chain>;
        const manager = makeManager({ recoverySigners: [primary, secondary] });
        manager.adoptRecoveryConfig(1, adopted);
        expect(manager.recoverySigners).toEqual([primary, adopted]);
    });

    it.each([-1, 2])("adoptRecoveryConfig() rejects the out-of-range index %s", (index) => {
        const manager = makeManager({ recoverySigners: [apiKeyConfig, asRecoveryConfig({ type: "device" })] });
        expect(() => manager.adoptRecoveryConfig(index, apiKeyConfig)).toThrow(/out of range/);
    });

    it.each([0, 1])(
        "stripSecretFromRecovery() replaces the secret-bearing server recovery at index %s with an address-only config",
        (index) => {
            const recoverySigners = [
                asRecoveryConfig({ type: "external-wallet", address: "0xExt" }),
                asRecoveryConfig({ type: "external-wallet", address: "0xExt2" }),
            ];
            recoverySigners[index] = asRecoveryConfig({ type: "server", secret: "topsecret" });
            const manager = makeManager({ recoverySigners });
            manager.stripSecretFromRecovery(index, "0xResolved");
            expect(manager.recoverySigners[index]).toEqual({ type: "server", address: "0xResolved" });
            expect(JSON.stringify(manager.recoverySigners)).not.toContain("topsecret");
        }
    );

    it("stripSecretFromRecovery() leaves an api-sourced server recovery untouched", () => {
        const recovery = asRecoveryConfig({ type: "server", address: "0xExisting" });
        const manager = makeManager({ recoverySigners: [recovery] });
        manager.stripSecretFromRecovery(0, "0xResolved");
        expect(manager.recovery).toBe(recovery);
    });

    it.each([
        ["a thrown getSigner call", vi.fn().mockRejectedValue(new Error("network"))],
        ["an error response", vi.fn().mockResolvedValue({ error: true, message: "nope" })],
        ["a null response", vi.fn().mockResolvedValue(null)],
        ["a non-object response", vi.fn().mockResolvedValue("not-an-object")],
    ])("getSignerState() falls back to a null state and logs a warning for %s", async (_name, getSigner) => {
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await expect(manager.getSignerState("api-key" as SignerLocator)).resolves.toEqual(NULL_SIGNER_STATE);
        expect(walletsLogger.warn).toHaveBeenCalled();
    });

    it("getSignerState() logs the specific fetch failure when getSigner throws", async () => {
        const getSigner = vi.fn().mockRejectedValue(new Error("network"));
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await manager.getSignerState("api-key" as SignerLocator);
        expect(walletsLogger.warn).toHaveBeenCalledWith(
            "wallet.signers.getSignerState.fetchFailed",
            expect.objectContaining({ signerLocator: "api-key" })
        );
    });

    it("getSignerState() logs the specific error response when getSigner resolves with an error shape", async () => {
        const getSigner = vi.fn().mockResolvedValue({ error: true, message: "nope" });
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await manager.getSignerState("api-key" as SignerLocator);
        expect(walletsLogger.warn).toHaveBeenCalledWith(
            "wallet.signers.getSignerState.errorResponse",
            expect.objectContaining({ signerLocator: "api-key" })
        );
    });

    it.each([
        ["success", true],
        ["awaiting-approval", false],
    ] as const)("isSignerApproved() maps a fetched signer with status %s to %s", async (status, expected) => {
        const getSigner = vi.fn().mockResolvedValue({
            type: "api-key",
            locator: "api-key:delegated",
            chains: { "base-sepolia": { status } },
        });
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await expect(manager.isSignerApproved("api-key:delegated")).resolves.toBe(expected);
    });

    it("isSignerApproved() resolves false when the signer is not registered", async () => {
        const notFound = new ApiClientError("API request failed: 404 Not Found", 404, "Not Found", null);
        const getSigner = vi.fn().mockRejectedValue(notFound);
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await expect(manager.isSignerApproved("api-key:unregistered")).resolves.toBe(false);
    });

    it.each([
        [
            "getSigner throws a non-404 API error",
            vi
                .fn()
                .mockRejectedValue(
                    new ApiClientError("API request failed: 401 Unauthorized", 401, "Unauthorized", null)
                ),
        ],
        ["getSigner throws a network error", vi.fn().mockRejectedValue(new Error("network"))],
        ["getSigner resolves with an error shape", vi.fn().mockResolvedValue({ error: true, message: "nope" })],
    ])("isSignerApproved() rejects and logs when %s", async (_name, getSigner) => {
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await expect(manager.isSignerApproved("api-key:delegated")).rejects.toThrow();
        expect(walletsLogger.error).toHaveBeenCalledWith(
            "wallet.signers.isSignerApproved.failed",
            expect.objectContaining({ signerLocator: "api-key:delegated" })
        );
    });

    const internalConfig = { type: "api-key", locator: "api-key", address: WALLET_ADDRESS } as never;

    it("assemble() marks admin signers active without calling getSigner", async () => {
        mockedAssembleSigner.mockReturnValue(makeSigner("admin"));
        const getSigner = vi.fn();
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        const result = await manager.assemble(internalConfig, { isAdminSigner: true });
        expect(result.status).toBe("active");
        expect(getSigner).not.toHaveBeenCalled();
    });

    it("assemble() reads status from getSigner for delegated signers", async () => {
        mockedAssembleSigner.mockReturnValue(makeSigner("delegated"));
        const getSigner = vi.fn().mockResolvedValue({
            type: "api-key",
            locator: "api-key:delegated",
            chains: { "base-sepolia": { status: "success" } },
        });
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        const result = await manager.assemble(internalConfig);
        expect(getSigner).toHaveBeenCalledTimes(1);
        expect(result.status).toBe("success");
    });
});
