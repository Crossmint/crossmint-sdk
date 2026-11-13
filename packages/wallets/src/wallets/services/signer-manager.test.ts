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
import {
    InvalidRecoveryConfigError,
    InvalidSignerError,
    RecoveryMethodRequiredError,
    SignerRequiredError,
} from "../../utils/errors";
import type { WalletOptions } from "../types";
import { SignerManager, type SignerManagerParams } from "./signer-manager";
import { assembleSigner } from "../../signers";
import { walletsLogger } from "../../logger";
import { createQuorumApiEntry, signerNotFound } from "../__tests__/test-helpers";

vi.mock("../../signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../signers")>();
    return { ...actual, assembleSigner: vi.fn() };
});

const mockedAssembleSigner = vi.mocked(assembleSigner);
const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const NULL_SIGNER_STATE = {
    response: null,
    signer: null,
    pendingOperation: null,
    approvingQuorum: null,
    lookupFailed: false,
};

const asRecoveryConfig = (config: unknown) => config as RecoverySignerConfigForChain<Chain>;
type Overrides = Partial<SignerManagerParams<Chain>>;

function makeSigner(type: SignerAdapter["type"], locator: SignerLocator): SignerAdapter {
    return { type, locator: () => locator, signMessage: vi.fn(), signTransaction: vi.fn() };
}

function makeApiKeySigner(tag: string): SignerAdapter {
    return makeSigner("api-key", `api-key:${tag}`);
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
        const signer = makeApiKeySigner("active");
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
        [
            "a quorum before an external-wallet recovery signer",
            {
                recoverySigners: [
                    createQuorumApiEntry(),
                    asRecoveryConfig({ type: "external-wallet", address: "0xExt" }),
                ],
            },
            /External wallet signers require/,
        ],
        [
            "quorum-only recovery and one delegated signer",
            { recoverySigners: [createQuorumApiEntry()], initialSigners: [apiKeyConfig] },
            /requires calling wallet\.useSigner\(\)/,
        ],
        [
            "quorum-only recovery and one delegated quorum",
            { recoverySigners: [createQuorumApiEntry()], initialSigners: [createQuorumApiEntry()] },
            /Every recovery method of this wallet is a quorum/,
        ],
        [
            "two delegated quorums and quorum-only recovery",
            {
                recoverySigners: [createQuorumApiEntry()],
                initialSigners: [createQuorumApiEntry(), createQuorumApiEntry()],
            },
            /Every recovery method of this wallet is a quorum/,
        ],
        [
            "two delegated quorums and a recovery signer that signs alone",
            {
                recoverySigners: [asRecoveryConfig({ type: "email", email: "recovery@example.com" })],
                initialSigners: [createQuorumApiEntry(), createQuorumApiEntry()],
            },
            /read-only/,
        ],
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
            const original = makeApiKeySigner("original");
            const recoverySigner = makeApiKeySigner("recovery");
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

    const primaryRecovery = asRecoveryConfig({
        type: "external-wallet",
        address: "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01",
    });
    const secondaryRecovery = asRecoveryConfig({ type: "email", email: "Second@Example.com" });
    const serverRecovery = asRecoveryConfig({ type: "server", address: "0xServerRecovery" });
    const multiRecovery = [primaryRecovery, secondaryRecovery, serverRecovery];

    it.each([
        ["a single recovery signer and no active signer", [apiKeyConfig], undefined, apiKeyConfig, undefined],
        [
            "a single recovery signer and an operational active signer",
            [apiKeyConfig],
            makeSigner("email", "email:operational@example.com"),
            apiKeyConfig,
            undefined,
        ],
        [
            "several recovery signers and the primary one active",
            multiRecovery,
            makeSigner("external-wallet", "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01"),
            primaryRecovery,
            "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01",
        ],
        [
            "several recovery signers and a secondary one active (matched on the normalized locator)",
            multiRecovery,
            makeSigner("email", "email:second@example.com"),
            secondaryRecovery,
            "email:second@example.com",
        ],
        [
            "several recovery signers and the primary one active with its EVM address in another case",
            multiRecovery,
            makeSigner("external-wallet", "external-wallet:0xABCDEF0123456789ABCDEF0123456789ABCDEF01"),
            primaryRecovery,
            "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01",
        ],
        [
            "several recovery signers and the api-sourced server one active",
            multiRecovery,
            makeSigner("server", "server:0xServerRecovery"),
            serverRecovery,
            "server:0xServerRecovery",
        ],
    ] as const)(
        "resolveAuthorizingRecovery() with %s picks the authorizing recovery signer",
        (_name, recoverySigners, signer, expectedRecovery, expectedApprover) => {
            const manager = makeManager({ recoverySigners: [...recoverySigners], signer });
            expect(manager.resolveAuthorizingRecovery()).toEqual({
                recovery: expectedRecovery,
                approver: expectedApprover,
            });
        }
    );

    it.each([
        ["no active signer", undefined, /must be selected/],
        [
            "an operational active signer",
            makeSigner("email", "email:operational@example.com"),
            /not one of this wallet's recovery methods/,
        ],
        [
            "an active server signer whose recovery entry still carries a secret",
            makeSigner("server", "server:0xUnresolved"),
            /not one of this wallet's recovery methods/,
        ],
    ] as const)(
        "resolveAuthorizingRecovery() with several recovery signers and %s throws a RecoveryMethodRequiredError listing them",
        (_name, signer, branchKeyword) => {
            const manager = makeManager({
                recoverySigners: [...multiRecovery, asRecoveryConfig({ type: "server", secret: "topsecret" })],
                signer,
            });
            expect(() => manager.resolveAuthorizingRecovery()).toThrow(RecoveryMethodRequiredError);
            expect(() => manager.resolveAuthorizingRecovery()).toThrow(SignerRequiredError);
            expect(() => manager.resolveAuthorizingRecovery()).toThrow(branchKeyword);
            expect(() => manager.resolveAuthorizingRecovery()).toThrow(
                "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01, email:second@example.com, server:0xServerRecovery"
            );
            expect(() => manager.resolveAuthorizingRecovery()).not.toThrow(/topsecret/);
        }
    );

    it("withRecoverySigner() assembles the active recovery signer and hands its locator to the operation", async () => {
        const active = makeSigner("external-wallet", "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01");
        const onSign = vi.fn();
        const recoverySigners = [
            asRecoveryConfig({ type: "api-key" }),
            asRecoveryConfig({
                type: "external-wallet",
                address: "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01",
                onSign,
            }),
        ];
        const assembled = makeSigner("external-wallet", "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01");
        mockedAssembleSigner.mockReturnValue(assembled);
        const manager = makeManager({ signer: active, recoverySigners });

        const approver = await manager.withRecoverySigner(async (approver) => approver);

        expect(approver).toBe("external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01");
        expect(mockedAssembleSigner).toHaveBeenCalledWith(
            "base-sepolia",
            expect.objectContaining({ type: "external-wallet", address: "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01" }),
            undefined
        );
        expect(manager.activeSigner).toBe(active);
    });

    it("withRecoverySigner() passes no approver for a wallet with a single recovery signer", async () => {
        mockedAssembleSigner.mockReturnValue(makeApiKeySigner("recovery"));
        const manager = makeManager({ signer: makeApiKeySigner("operational"), recoverySigners: [apiKeyConfig] });
        await expect(manager.withRecoverySigner(async (approver) => approver)).resolves.toBeUndefined();
    });

    it("constructor rejects an empty recovery signer list", () => {
        expect(() => makeManager({ recoverySigners: [] })).toThrow(InvalidRecoveryConfigError);
    });

    it("recovery is the first entry of recoverySigners", () => {
        const primary = asRecoveryConfig({
            type: "external-wallet",
            address: "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01",
        });
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
        const primary = asRecoveryConfig({
            type: "external-wallet",
            address: "0xAbCdEf0123456789aBcDeF0123456789AbCdEf01",
        });
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
        ["a thrown getSigner call", vi.fn().mockRejectedValue(new Error("network")), true],
        [
            "a server error",
            vi.fn().mockRejectedValue(new ApiClientError("API request failed: 503", 503, "Service Unavailable", null)),
            true,
        ],
        // The client throws a 404 for a signer the wallet does not have: it is read as not registered.
        ["a signer the wallet does not have", vi.fn().mockRejectedValue(signerNotFound()), false],
        ["an error response", vi.fn().mockResolvedValue({ error: true, message: "nope" }), false],
        ["a null response", vi.fn().mockResolvedValue(null), false],
        ["a non-object response", vi.fn().mockResolvedValue("not-an-object"), false],
    ])(
        "getSignerState() falls back to a null state and logs a warning for %s",
        async (_name, getSigner, lookupFailed) => {
            const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
            await expect(manager.getSignerState("api-key" as SignerLocator)).resolves.toEqual({
                ...NULL_SIGNER_STATE,
                lookupFailed,
            });
            expect(walletsLogger.warn).toHaveBeenCalled();
        }
    );

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
        mockedAssembleSigner.mockReturnValue(makeApiKeySigner("admin"));
        const getSigner = vi.fn();
        const manager = makeManager({ apiClient: makeApiClient({ getSigner }) });
        const result = await manager.assemble(internalConfig, { isAdminSigner: true });
        expect(result.status).toBe("active");
        expect(getSigner).not.toHaveBeenCalled();
    });

    it("assemble() reads status from getSigner for delegated signers", async () => {
        mockedAssembleSigner.mockReturnValue(makeApiKeySigner("delegated"));
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

describe("SignerManager with quorum recovery methods", () => {
    const emailRecovery = asRecoveryConfig({ type: "email", email: "recovery@example.com" });
    const phoneRecovery = asRecoveryConfig({ type: "phone", phone: "+15550000001" });

    describe("when every recovery method is a quorum", () => {
        const QUORUM_ONLY_LISTS = [
            ["one quorum", [createQuorumApiEntry()]],
            ["two quorums", [createQuorumApiEntry(), createQuorumApiEntry()]],
        ] as const;

        it.each(QUORUM_ONLY_LISTS)(
            "require() with %s throws RecoveryMethodRequiredError naming every quorum",
            (_name, recoverySigners) => {
                const error = (() => {
                    try {
                        makeManager({ recoverySigners: [...recoverySigners] }).require();
                    } catch (caught) {
                        return caught;
                    }
                })();

                expect(error).toBeInstanceOf(RecoveryMethodRequiredError);
                expect(String(error)).toContain("useSigner()");
                for (const quorum of recoverySigners) {
                    expect(String(error)).toContain(quorum.locator);
                }
            }
        );

        it.each(QUORUM_ONLY_LISTS)(
            "withRecoverySigner() with %s throws RecoveryMethodRequiredError, asking for a member or the signer option, without running the operation",
            async (_name, recoverySigners) => {
                const operation = vi.fn();

                const authorizing = makeManager({ recoverySigners: [...recoverySigners] }).withRecoverySigner(
                    operation
                );

                await expect(authorizing).rejects.toBeInstanceOf(RecoveryMethodRequiredError);
                await expect(authorizing).rejects.toThrow(/useRecoveryMethod\(\) with a key that is a member/);
                expect(operation).not.toHaveBeenCalled();
            }
        );
    });

    describe("when a quorum comes before recovery methods that sign alone", () => {
        it("defaultRecovery is the first of those methods", () => {
            const manager = makeManager({ recoverySigners: [createQuorumApiEntry(), emailRecovery, phoneRecovery] });

            expect(manager.defaultRecovery).toBe(emailRecovery);
        });

        // Swift and Kotlin count quorums too: with several recovery methods, one must be active or selected.
        it("asks to select a recovery method even when only one of them signs alone", async () => {
            const operation = vi.fn();
            const quorum = createQuorumApiEntry();
            const manager = makeManager({ recoverySigners: [quorum, emailRecovery] });

            const error = await manager.withRecoverySigner(operation).catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(RecoveryMethodRequiredError);
            expect(String(error)).toContain("(email:recovery@example.com)");
            expect(String(error)).not.toContain(quorum.locator);
            expect(operation).not.toHaveBeenCalled();
        });

        it("authorizes with that method when it is the active signer, naming it as approver", async () => {
            const operation = vi.fn().mockResolvedValue("done");
            const manager = makeManager({
                recoverySigners: [createQuorumApiEntry(), emailRecovery],
                signer: makeSigner("email", "email:recovery@example.com"),
            });

            await manager.withRecoverySigner(operation);

            expect(operation).toHaveBeenCalledWith("email:recovery@example.com");
        });

        it("asks to select a recovery method and offers only those methods", async () => {
            const quorum = createQuorumApiEntry();
            const manager = makeManager({ recoverySigners: [quorum, emailRecovery, phoneRecovery] });

            const error = await manager.withRecoverySigner(vi.fn()).catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(RecoveryMethodRequiredError);
            expect(String(error)).toContain("email:recovery@example.com");
            expect(String(error)).not.toContain(quorum.locator);
        });
    });

    it("recoveryLocator() returns the quorum's own locator", () => {
        const quorum = createQuorumApiEntry();

        expect(makeManager().recoveryLocator(quorum)).toBe(quorum.locator);
    });

    describe("when a second quorum is added", () => {
        it("keeps both as separate recovery methods", () => {
            const first = createQuorumApiEntry();
            const second = createQuorumApiEntry();
            const manager = makeManager({ recoverySigners: [first] });

            manager.addRecoverySigner(second);

            expect(manager.recoverySigners).toEqual([first, second]);
        });
    });
});

describe("SignerManager.heldSigners", () => {
    const ACTIVE_LOCATOR: SignerLocator = "external-wallet:0xActive";
    const RECOVERY_LOCATOR: SignerLocator = "external-wallet:0x1234567890aBcDeF1234567890AbCdEf12345678";
    const RECOVERY_WITH_ON_SIGN = asRecoveryConfig({
        type: "external-wallet",
        address: "0x1234567890aBcDeF1234567890AbCdEf12345678",
        onSign: vi.fn(),
    });

    describe("when only an active signer is set", () => {
        it("returns the active signer", () => {
            const active = makeSigner("external-wallet", ACTIVE_LOCATOR);

            expect(makeManager({ signer: active }).heldSigners()).toEqual([active]);
        });
    });

    describe("when a recovery method was selected with useRecoveryMethod()", () => {
        it("adds it after the active signer, assembled from the selected config", () => {
            const active = makeSigner("external-wallet", ACTIVE_LOCATOR);
            const assembled = makeSigner("external-wallet", RECOVERY_LOCATOR);
            mockedAssembleSigner.mockReturnValue(assembled);
            const manager = makeManager({ signer: active, recoverySigners: [apiKeyConfig, RECOVERY_WITH_ON_SIGN] });
            manager.selectRecovery(1);

            expect(manager.heldSigners()).toEqual([active, assembled]);
            expect(mockedAssembleSigner).toHaveBeenCalledWith(
                "base-sepolia",
                expect.objectContaining({
                    type: "external-wallet",
                    address: "0x1234567890aBcDeF1234567890AbCdEf12345678",
                }),
                undefined
            );
        });

        it("lists it once when it is also the active signer", () => {
            const active = makeSigner("external-wallet", RECOVERY_LOCATOR);
            mockedAssembleSigner.mockReturnValue(makeSigner("external-wallet", RECOVERY_LOCATOR));
            const manager = makeManager({ signer: active, recoverySigners: [apiKeyConfig, RECOVERY_WITH_ON_SIGN] });
            manager.selectRecovery(1);

            expect(manager.heldSigners()).toEqual([active]);
        });

        it("lists it once when the active signer's EVM address differs only in case", () => {
            const active = makeSigner("external-wallet", "external-wallet:0x1234567890ABCDEF1234567890ABCDEF12345678");
            mockedAssembleSigner.mockReturnValue(makeSigner("external-wallet", RECOVERY_LOCATOR));
            const manager = makeManager({ signer: active, recoverySigners: [apiKeyConfig, RECOVERY_WITH_ON_SIGN] });
            manager.selectRecovery(1);

            expect(manager.heldSigners()).toEqual([active]);
        });

        it("throws withRecoverySigner's error when the selection cannot be assembled", () => {
            const manager = makeManager({
                signer: makeSigner("external-wallet", ACTIVE_LOCATOR),
                recoverySigners: [
                    apiKeyConfig,
                    asRecoveryConfig({
                        type: "external-wallet",
                        address: "0x1234567890aBcDeF1234567890AbCdEf12345678",
                    }),
                ],
            });
            manager.selectRecovery(1);

            expect(() => manager.heldSigners()).toThrow(/Cannot assemble external wallet signer/);
        });

        it("throws InvalidSignerError when the selection is a quorum", () => {
            const quorum = createQuorumApiEntry();
            const manager = makeManager({ recoverySigners: [apiKeyConfig, quorum] });
            manager.selectRecovery(1);

            expect(() => manager.heldSigners()).toThrow(InvalidSignerError);
        });
    });

    describe("when additional signers are passed", () => {
        it("puts them first", () => {
            const active = makeSigner("external-wallet", ACTIVE_LOCATOR);
            const additional = makeSigner("external-wallet", "external-wallet:0xAdditional");

            expect(makeManager({ signer: active }).heldSigners([additional])).toEqual([additional, active]);
        });

        it("keeps the additional signer when it has the active signer's locator", () => {
            const active = makeSigner("external-wallet", ACTIVE_LOCATOR);
            const additional = makeSigner("external-wallet", ACTIVE_LOCATOR);

            expect(makeManager({ signer: active }).heldSigners([additional])).toEqual([additional]);
        });
    });

    describe("when no active signer is set", () => {
        it("returns the additional signers and the selected recovery method without throwing", () => {
            const additional = makeSigner("external-wallet", "external-wallet:0xAdditional");
            const assembled = makeSigner("external-wallet", RECOVERY_LOCATOR);
            mockedAssembleSigner.mockReturnValue(assembled);
            const manager = makeManager({ recoverySigners: [apiKeyConfig, RECOVERY_WITH_ON_SIGN] });
            manager.selectRecovery(1);

            expect(manager.heldSigners([additional])).toEqual([additional, assembled]);
        });
    });
});

describe("SignerManager.withApprover", () => {
    const RECOVERY_LOCATOR: SignerLocator = "external-wallet:0x1234567890aBcDeF1234567890AbCdEf12345678";
    const storedRecovery = asRecoveryConfig({
        type: "external-wallet",
        address: "0x1234567890aBcDeF1234567890AbCdEf12345678",
    });

    describe("when the signer option names the recovery method selected with useRecoveryMethod()", () => {
        it("assembles the selected config, which carries the caller's callback, not the stored entry", async () => {
            const onSign = vi.fn();
            const selected = asRecoveryConfig({ ...storedRecovery, onSign });
            mockedAssembleSigner.mockReturnValue(makeSigner("external-wallet", RECOVERY_LOCATOR));
            const manager = makeManager({ recoverySigners: [apiKeyConfig, storedRecovery] });
            manager.selectRecovery(1, selected);

            const approver = await manager.withApprover({ explicit: RECOVERY_LOCATOR }, async (approver) => approver);

            expect(approver).toBe(RECOVERY_LOCATOR);
            expect(mockedAssembleSigner).toHaveBeenCalledWith(
                "base-sepolia",
                expect.objectContaining({ onSign }),
                undefined
            );
        });
    });

    describe("when the signer option names a recovery method that is not selected", () => {
        it("assembles the stored entry", async () => {
            mockedAssembleSigner.mockReturnValue(makeSigner("external-wallet", RECOVERY_LOCATOR));
            const withOnSign = asRecoveryConfig({ ...storedRecovery, onSign: vi.fn() });
            const manager = makeManager({ recoverySigners: [apiKeyConfig, withOnSign] });

            await manager.withApprover({ explicit: RECOVERY_LOCATOR }, async (approver) => approver);

            expect(mockedAssembleSigner).toHaveBeenCalledWith(
                "base-sepolia",
                expect.objectContaining({ onSign: withOnSign.onSign }),
                undefined
            );
        });
    });
});

describe("SignerManager.memberStandsIn", () => {
    const MEMBER_LOCATOR = "external-wallet:0xMember";
    const member = asRecoveryConfig({ type: "external-wallet", address: "0xMember", onSign: vi.fn() });

    it("is true when a member is selected and no key is active", () => {
        const manager = makeManager();
        manager.selectRecoveryMember(member, MEMBER_LOCATOR);

        expect(manager.memberStandsIn).toBe(true);
    });

    it("is false when a key is active, even with a member selected", () => {
        const manager = makeManager({ signer: makeSigner("external-wallet", "external-wallet:0xActive") });
        manager.selectRecoveryMember(member, MEMBER_LOCATOR);

        expect(manager.memberStandsIn).toBe(false);
    });

    it("is false when no member is selected", () => {
        expect(makeManager().memberStandsIn).toBe(false);
    });
});
