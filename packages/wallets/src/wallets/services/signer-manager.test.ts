import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import type { RecoverySignerConfigForChain, SignerAdapter, SignerLocator } from "../../signers/types";
import type { ServerSignerResolver } from "../../signers/server/resolver";
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

const quorumRecovery = asRecoveryConfig({
    type: "quorum",
    threshold: 1,
    locator: "quorum:abc",
    signers: [
        { type: "external-wallet", address: "0xMember", locator: "external-wallet:0xMember" },
        { type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" },
    ],
});

beforeEach(() => {
    vi.clearAllMocks();
    walletsLogger.warn = vi.fn();
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
            /requires calling wallet\.useSigner\(\)/,
        ],
        ["a read-only wallet", { recovery: apiKeyConfig }, /read-only/],
        ["a quorum recovery signer", { recovery: quorumRecovery }, /quorum member you hold/],
    ] as const)("require() with no active signer reports %s", async (_name, overrides, branchKeyword) => {
        await expectThrowsMatching(() => makeManager(overrides as Overrides).require(), branchKeyword);
    });

    it("require() with a quorum recovery lists the member locators", async () => {
        await expectThrowsMatching(
            () => makeManager({ recovery: quorumRecovery }).require(),
            /\[external-wallet:0xMember, email:alice@gmail\.com\]/
        );
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

    it("withRecoverySigner() runs the operation with the active quorum member without reassembling", async () => {
        const member = { locator: () => "external-wallet:0xMember" as SignerLocator } as unknown as SignerAdapter;
        const manager = makeManager({ signer: member, recovery: quorumRecovery });
        let signerDuringOperation: SignerAdapter | undefined;

        await expect(
            manager.withRecoverySigner(() => {
                signerDuringOperation = manager.activeSigner;
                return Promise.resolve("ok");
            })
        ).resolves.toBe("ok");

        expect(signerDuringOperation).toBe(member);
        expect(mockedAssembleSigner).not.toHaveBeenCalled();
        expect(manager.activeSigner).toBe(member);
    });

    it.each([
        ["no active signer", undefined],
        ["an active signer that is not a member", makeSigner("outsider")],
    ])("withRecoverySigner() with a quorum recovery and %s instructs selecting a member", async (_name, signer) => {
        await expectThrowsMatching(
            () => makeManager({ signer, recovery: quorumRecovery }).withRecoverySigner(async () => "unused"),
            /quorum member you hold/
        );
        expect(mockedAssembleSigner).not.toHaveBeenCalled();
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

    it("stripSecretFromRecovery() strips only the resolved server member's secret inside a quorum", () => {
        const manager = makeManager({
            serverSignerResolver: makeResolver({ resolvedRecoveryAddress: "0xM" }),
            recovery: asRecoveryConfig({
                type: "quorum",
                signers: [
                    { type: "server", secret: "topsecret", address: "0xM", locator: "server:0xM" },
                    { type: "server", secret: "unresolved", address: "0xOther", locator: "server:0xOther" },
                    { type: "server", secret: "no-api-address" },
                    { type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" },
                ],
            }),
        });

        manager.stripSecretFromRecovery();

        const { signers } = manager.recovery as unknown as { signers: Array<Record<string, unknown>> };
        expect(signers[0]).toEqual({ type: "server", address: "0xM", locator: "server:0xM" });
        // The resolver caches a single derivation — a member it never resolved keeps its secret.
        expect(signers[1]).toEqual({
            type: "server",
            secret: "unresolved",
            address: "0xOther",
            locator: "server:0xOther",
        });
        expect(signers[2]).toEqual({ type: "server", secret: "no-api-address" });
        expect(signers[3]).toEqual({ type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" });
    });

    it("adoptQuorumMemberConfig() replaces only the matched member and records the selection", () => {
        const manager = makeManager({ recovery: quorumRecovery });
        const onSign = vi.fn();

        manager.adoptQuorumMemberConfig("external-wallet:0xMember", {
            type: "external-wallet",
            address: "0xMember",
            locator: "external-wallet:0xMember",
            onSign,
        });

        const { signers } = manager.recovery as unknown as { signers: Array<Record<string, unknown>> };
        expect(signers[0]).toMatchObject({ type: "external-wallet", address: "0xMember", onSign });
        expect(signers[1]).toEqual({ type: "email", email: "alice@gmail.com", locator: "email:alice@gmail.com" });
        expect(manager.adoptedAssemblableQuorumMember()).toMatchObject({ type: "external-wallet", onSign });
    });

    it("adoptedAssemblableQuorumMember() returns null when no member was selected this session", () => {
        expect(makeManager({ recovery: quorumRecovery }).adoptedAssemblableQuorumMember()).toBeNull();
    });

    it("adoptedAssemblableQuorumMember() skips adopted members that cannot auto-assemble", () => {
        const manager = makeManager({ recovery: quorumRecovery });
        // An external-wallet member without an onSign callback cannot be reassembled silently.
        manager.adoptQuorumMemberConfig("external-wallet:0xMember", {
            type: "external-wallet",
            address: "0xMember",
            locator: "external-wallet:0xMember",
        });
        expect(manager.adoptedAssemblableQuorumMember()).toBeNull();
    });

    it.each([
        ["another member's derivation is the cached one", "0xOtherMember", null],
        ["its own derivation is the cached one", "0xM", { type: "server", address: "0xM" }],
    ])(
        "adoptedAssemblableQuorumMember() with an adopted secret-less server member when %s",
        (_name, resolvedRecoveryAddress, expected) => {
            const serverQuorum = asRecoveryConfig({
                type: "quorum",
                signers: [{ type: "server", address: "0xM", locator: "server:0xM" }],
            });
            const manager = makeManager({
                serverSignerResolver: makeResolver({ resolvedRecoveryAddress }),
                recovery: serverQuorum,
            });
            manager.adoptQuorumMemberConfig("server:0xM", { type: "server", address: "0xM", locator: "server:0xM" });
            if (expected == null) {
                expect(manager.adoptedAssemblableQuorumMember()).toBeNull();
            } else {
                expect(manager.adoptedAssemblableQuorumMember()).toMatchObject(expected);
            }
        }
    );

    it("adoptQuorumMemberConfig() with a locator matching no member records nothing", () => {
        const manager = makeManager({ recovery: quorumRecovery });

        manager.adoptQuorumMemberConfig("external-wallet:0xNobody", {
            type: "external-wallet",
            address: "0xNobody",
            locator: "external-wallet:0xNobody",
            onSign: vi.fn(),
        });

        expect(manager.recovery).toBe(quorumRecovery);
        expect(manager.adoptedAssemblableQuorumMember()).toBeNull();
        expect(walletsLogger.warn).toHaveBeenCalledWith("signerManager.adoptQuorumMemberConfig.noSuchMember", {
            memberLocator: "external-wallet:0xNobody",
        });
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
