import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type { RecoverySignerConfigForChain, SignerAdapter, SignerLocator } from "../../signers/types";
import type { ServerSignerResolver } from "../../signers/server/resolver";
import type { WalletOptions } from "../types";
import { SignerManager, type SignerManagerParams } from "./signer-manager";
import { assembleSigner } from "../../signers";

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

function makeResolver(overrides: Partial<ServerSignerResolver> = {}): ServerSignerResolver {
    return {
        hasRecoveryResolution: false,
        resolvedRecoveryAddress: null,
        ...overrides,
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
        recovery: { type: "api-key" } as RecoverySignerConfigForChain<C>,
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
        ["a server recovery signer", { recovery: { type: "server", address: "0xServer" } }, /server secret/],
        [
            "an external-wallet recovery signer",
            { recovery: asRecoveryConfig({ type: "external-wallet", address: "0xExt" }) },
            /External wallet signers require/,
        ],
        [
            "a non-auto-assemblable recovery signer",
            { recovery: asRecoveryConfig({ type: "device" }) },
            /External wallet signers require/,
        ],
        ["a read-only wallet", { recovery: apiKeyConfig }, /read-only/],
    ] as const)("require() with no active signer reports %s", async (_name, overrides, branchKeyword) => {
        await expectThrowsMatching(() => makeManager(overrides as Overrides).require(), branchKeyword);
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
            const manager = makeManager({ signer: original, recovery: { type: "api-key" } });
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
                recovery: { type: "server", address: "0xServer" },
                serverSignerResolver: makeResolver({ hasRecoveryResolution: false }),
            },
            /Cannot assemble server signer/,
        ],
        [
            "the recovery external wallet has no onSign callback",
            { recovery: asRecoveryConfig({ type: "external-wallet", address: "0xExt" }) },
            /Cannot assemble external wallet signer/,
        ],
    ] as const)("withRecoverySigner() throws when %s", async (_name, overrides, branchKeyword) => {
        await expectThrowsMatching(
            () => makeManager(overrides as Overrides).withRecoverySigner(async () => "unused"),
            branchKeyword
        );
    });

    it("stripSecretFromRecovery() replaces a secret-bearing server recovery with an address-only config", () => {
        const manager = makeManager({
            recovery: asRecoveryConfig({ type: "server", secret: "topsecret" }),
            serverSignerResolver: makeResolver({ resolvedRecoveryAddress: "0xResolved" }),
        });
        manager.stripSecretFromRecovery();
        expect(manager.recovery).toEqual({ type: "server", address: "0xResolved" });
    });

    it.each([
        [
            "there is no resolved recovery address",
            asRecoveryConfig({ type: "server", secret: "topsecret" }),
            { resolvedRecoveryAddress: null },
        ],
        [
            "the recovery is already api-sourced",
            asRecoveryConfig({ type: "server", address: "0xExisting" }),
            { resolvedRecoveryAddress: "0xResolved" },
        ],
    ])("stripSecretFromRecovery() leaves recovery untouched when %s", (_name, recovery, resolver) => {
        const manager = makeManager({ recovery, serverSignerResolver: makeResolver(resolver) });
        manager.stripSecretFromRecovery();
        expect(manager.recovery).toBe(recovery);
    });

    it.each([
        ["a thrown getSigner call", vi.fn().mockRejectedValue(new Error("network"))],
        ["an error response", vi.fn().mockResolvedValue({ error: true, message: "nope" })],
        ["a null response", vi.fn().mockResolvedValue(null)],
        ["a non-object response", vi.fn().mockResolvedValue("not-an-object")],
    ])("getSignerState() swallows %s to a null state", async (_name, getSigner) => {
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        await expect(manager.getSignerState("api-key" as SignerLocator)).resolves.toEqual(NULL_SIGNER_STATE);
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
