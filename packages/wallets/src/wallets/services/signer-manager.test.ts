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
const NULL_STATE = { response: null, signer: null, pendingOperation: null };
const NOT_THROWN = Symbol("not thrown");

const rec = (config: unknown) => config as RecoverySignerConfigForChain<Chain>;
type Overrides = Partial<SignerManagerParams<Chain>>;

const MSG = {
    multiple:
        "No signer is set. This wallet has multiple signers configured. " +
        "Call wallet.useSigner() to select which signer to use before signing operations.",
    serverNoSigner:
        "No signer is set. Server wallets require calling wallet.useSigner() with the server secret before signing operations.\n" +
        'Example: wallet.useSigner({ type: "server", secret: process.env.YOUR_SERVER_SECRET })',
    externalNoSigner:
        "No signer is set. External wallet signers require calling wallet.useSigner() with the onSign callback before signing operations.\n" +
        'Example: wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... })',
    readOnly:
        "This wallet is read-only because no signer was provided. Operations that require signing (send, approve, addSigner, etc.) are not available.",
    serverGuard:
        "Cannot assemble server signer: no secret available. " +
        'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.',
    externalGuard:
        "Cannot assemble external wallet signer: no onSign callback available. " +
        'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.',
};

function makeAdapter(tag: string): SignerAdapter {
    return { locator: () => `api-key:${tag}` as SignerLocator, status: undefined } as unknown as SignerAdapter;
}

function makeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
    return { crossmint: {}, getSigner: vi.fn(), ...overrides } as unknown as ApiClient;
}

function makeResolver(o: Partial<ServerSignerResolver> = {}): ServerSignerResolver {
    return { hasRecoveryResolution: false, resolvedRecoveryAddress: null, ...o } as unknown as ServerSignerResolver;
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
        listSigners: async () => [],
        ...overrides,
    });
}

async function expectExactError(run: () => unknown, exactMessage: string): Promise<void> {
    let caught: unknown = NOT_THROWN;
    try {
        await run();
    } catch (e) {
        caught = e;
    }
    expect(caught).not.toBe(NOT_THROWN);
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(exactMessage);
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("SignerManager", () => {
    it("require() returns the active signer when one is set", () => {
        const active = makeAdapter("active");
        expect(makeManager({ signer: active }).require()).toBe(active);
    });

    const apiKey = { type: "api-key" } as const;
    const readOnlyCases: Array<[string, Overrides, string]> = [
        ["multiple signers", { initialSigners: [apiKey, apiKey] }, MSG.multiple],
        ["server", { recovery: { type: "server", address: "0xServer" } }, MSG.serverNoSigner],
        ["external-wallet", { recovery: rec({ type: "external-wallet", address: "0xext" }) }, MSG.externalNoSigner],
        ["device", { recovery: rec({ type: "device" }) }, MSG.externalNoSigner],
        ["generic", { recovery: apiKey }, MSG.readOnly],
    ];

    it.each(readOnlyCases)("require() throws the exact message for %s", async (_name, overrides, message) => {
        await expectExactError(() => makeManager(overrides).require(), message);
    });

    it.each([
        ["success", true],
        ["active", true],
        ["pending", false],
        [undefined, false],
    ])("isApprovedSignerStatus() %s -> %s", (status, expected) => {
        expect(makeManager().isApprovedSignerStatus(status as never)).toBe(expected);
    });

    it.each([true, false])("withRecoverySigner() swaps to recovery then restores original (ok=%s)", async (ok) => {
        const original = makeAdapter("original");
        const recovery = makeAdapter("recovery");
        mockedAssembleSigner.mockReturnValue(recovery);
        const manager = makeManager({ signer: original, recovery: { type: "api-key" } });
        const boom = new Error("operation failed");
        let activeDuringOperation: SignerAdapter | undefined;
        const run = manager.withRecoverySigner(() => {
            activeDuringOperation = manager.active;
            return ok ? Promise.resolve("ok") : Promise.reject(boom);
        });
        if (ok) {
            expect(await run).toBe("ok");
        } else {
            await expect(run).rejects.toBe(boom);
        }
        expect(activeDuringOperation).toBe(recovery);
        expect(manager.active).toBe(original);
    });

    const unresolved = { serverSignerResolver: makeResolver({ hasRecoveryResolution: false }) };
    const guardCases: Array<[string, Overrides, string]> = [
        ["server-secret", { recovery: { type: "server", address: "0xS" }, ...unresolved }, MSG.serverGuard],
        ["external-wallet", { recovery: rec({ type: "external-wallet", address: "0xext" }) }, MSG.externalGuard],
    ];

    it.each(guardCases)("withRecoverySigner() throws %s", async (_name, overrides, message) => {
        await expectExactError(() => makeManager(overrides).withRecoverySigner(async () => "unused"), message);
    });

    it("stripSecretFromRecovery() replaces a secret-bearing server recovery with an address-only config", () => {
        const manager = makeManager({
            recovery: { type: "server", secret: "topsecret" } as unknown as RecoverySignerConfigForChain<Chain>,
            serverSignerResolver: makeResolver({ resolvedRecoveryAddress: "0xResolved" }),
        });
        manager.stripSecretFromRecovery();
        expect(manager.recovery).toEqual({ type: "server", address: "0xResolved" });
    });

    type StripCase = [string, RecoverySignerConfigForChain<Chain>, Partial<ServerSignerResolver>];
    const stripNoOpCases: StripCase[] = [
        ["no resolved address", rec({ type: "server", secret: "topsecret" }), { resolvedRecoveryAddress: null }],
        ["already api-sourced", rec({ type: "server", address: "0xE" }), { resolvedRecoveryAddress: "0xR" }],
    ];

    it.each(stripNoOpCases)("stripSecretFromRecovery() leaves recovery untouched: %s", (_name, recovery, resolver) => {
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
        await expect(manager.getSignerState("api-key" as SignerLocator)).resolves.toEqual(NULL_STATE);
    });

    const internalConfig = { type: "api-key", locator: "api-key", address: WALLET_ADDRESS } as never;

    it("assemble() marks admin signers active without calling getSigner", async () => {
        mockedAssembleSigner.mockReturnValue(makeAdapter("admin"));
        const getSigner = vi.fn();
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        const result = await manager.assemble(internalConfig, { isAdminSigner: true });
        expect(result.status).toBe("active");
        expect(getSigner).not.toHaveBeenCalled();
    });

    it("assemble() reads status from getSigner for delegated signers", async () => {
        mockedAssembleSigner.mockReturnValue(makeAdapter("delegated"));
        const chains = { "base-sepolia": { status: "success" } };
        const getSigner = vi.fn().mockResolvedValue({ type: "api-key", locator: "api-key:delegated", chains });
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        const result = await manager.assemble(internalConfig);
        expect(getSigner).toHaveBeenCalledTimes(1);
        expect(result.status).toBe("success");
    });
});
