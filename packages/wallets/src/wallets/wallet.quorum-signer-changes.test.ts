import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import {
    InvalidRecoveryConfigError,
    QuorumSelectionAmbiguousError,
    RecoveryMethodRequiredError,
    TransactionAwaitingApprovalError,
} from "../utils/errors";
import type { Wallet } from "./wallet";
import {
    activeSignerMember,
    createMockApiClient,
    createMockWallet,
    createMockWalletWithoutSigner,
    createQuorumApiEntry,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    createSigningWallet,
    signatureOver,
    type MockedApiClient,
} from "./__tests__/test-helpers";

// One person's key on a chain: the config passed to useRecoveryMethod / useSigner, and its member entry.
const memberKey = (address: string) => ({
    config: {
        type: "external-wallet",
        address,
        onSign: vi.fn(async (payload: string) => signatureOver(payload)),
    } as unknown as SignerConfigForChain<Chain>,
    member: { type: "external-wallet", address, locator: `external-wallet:${address}` } as QuorumMember,
});
const ALICE: Record<string, string> = {
    solana: "AliceMember1111111111111111111111111111111",
    stellar: "GALICEMEMBER",
    "base-sepolia": "0x6666666666666666666666666666666666666666",
};
const BOB: Record<string, string> = {
    solana: "BobMember11111111111111111111111111111111111",
    stellar: "GBOBMEMBER",
    "base-sepolia": "0x7777777777777777777777777777777777777777",
};

// One signer-change call: `run` makes it with `options`, `approver` reads the approver it sent.
type SignerChangePath = {
    name: string;
    run: (wallet: Wallet<Chain>, options: object) => Promise<unknown>;
    approver: (api: MockedApiClient) => unknown;
    called: (api: MockedApiClient) => boolean;
};

const PATHS: SignerChangePath[] = [
    {
        name: "addSigner",
        run: (wallet, options) =>
            wallet.addSigner({ type: "external-wallet", address: "NewSigner444" } as never, options as never),
        approver: (api) => api.registerSigner.mock.calls[0][1].approver,
        called: (api) => api.registerSigner.mock.calls.length > 0,
    },
    {
        name: "removeSigner",
        run: (wallet, options) =>
            wallet.removeSigner({ type: "external-wallet", address: "Delegated333" } as never, options as never),
        approver: (api) => api.removeSigner.mock.calls[0][2].approver,
        called: (api) => api.removeSigner.mock.calls.length > 0,
    },
    {
        name: "addRecoveryMethod",
        run: (wallet, options) =>
            wallet.addRecoveryMethod({ type: "external-wallet", address: "NewRecovery555" } as never, options as never),
        approver: (api) => api.registerRecoveryMethod.mock.calls[0][1].approver,
        called: (api) => api.registerRecoveryMethod.mock.calls.length > 0,
    },
    {
        name: "removeRecoveryMethod",
        run: (wallet, options) => wallet.removeRecoveryMethod({ type: "api-key" } as never, options as never),
        approver: (api) => api.removeRecoveryMethod.mock.calls[0][2].approver,
        called: (api) => api.removeRecoveryMethod.mock.calls.length > 0,
    },
];

const REGISTERED = { type: "external-wallet", address: "NewSigner444", locator: "external-wallet:NewSigner444" };
// Recovery-method changes are not on EVM in this stack (#2219).
const CHAINS = [
    {
        chain: "solana" as const,
        paths: PATHS,
        registered: { ...REGISTERED, transaction: { id: "txn-change", status: "awaiting-approval" } },
    },
    {
        chain: "stellar" as const,
        paths: PATHS,
        registered: { ...REGISTERED, transaction: { id: "txn-change", status: "awaiting-approval" } },
    },
    {
        chain: "base-sepolia" as const,
        paths: PATHS.filter(({ name }) => name === "addSigner" || name === "removeSigner"),
        registered: {
            ...REGISTERED,
            chains: { "base-sepolia": { id: "txn-change", status: "awaiting-approval", onChain: {} } },
        },
    },
];

function mockSignerChangeResponses(api: MockedApiClient, registered: object) {
    api.registerSigner.mockResolvedValue(registered as never);
    api.removeSigner.mockResolvedValue({ id: "txn-change", status: "awaiting-approval" } as never);
    api.registerRecoveryMethod.mockResolvedValue({ tx: { id: "txn-change" } } as never);
    api.removeRecoveryMethod.mockResolvedValue({ id: "txn-change", status: "awaiting-approval" } as never);
    api.approveTransaction.mockResolvedValue({ id: "txn-change", status: "pending" } as never);
}

// An api-key wallet whose recovery methods are api-key and `quorums`.
const walletWithRecovery = (chain: Chain, api: MockedApiClient, recovery: object[]) =>
    createMockWallet(chain, api, "api-key", recovery as unknown as RecoverySignerConfigForChain<Chain>[]);

const awaiting = (pending: object[], chainType: string) => ({
    id: "txn-change",
    status: "awaiting-approval",
    chainType,
    approvals: { pending, submitted: [] },
});
const CHAIN_TYPES: Record<string, string> = { solana: "solana", stellar: "stellar", "base-sepolia": "evm" };

async function settle<T>(call: Promise<T>): Promise<{ value?: T; error?: unknown }> {
    const outcome = call.then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
    );
    await vi.runAllTimersAsync();
    return outcome;
}

describe.each(CHAINS)("signer changes approved by a recovery quorum on $chain", ({ chain, paths, registered }) => {
    let api: MockedApiClient;
    const alice = memberKey(ALICE[chain]);

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
        mockSignerChangeResponses(api, registered);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(paths)("$name", ({ run, approver, called }) => {
        describe("when the signer option names a recovery quorum", () => {
            it("sends that quorum as the approver and keeps the active signer", async () => {
                const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
                const activeBefore = wallet.signer?.locator();

                await run(wallet, { prepareOnly: true, signer: recoveryQuorum.locator });

                expect(approver(api)).toBe(recoveryQuorum.locator);
                expect(wallet.signer?.locator()).toBe(activeBefore);
            });
        });

        describe("when a member of a recovery quorum is selected with useRecoveryMethod", () => {
            it("sends the member's recovery quorum as the approver", async () => {
                const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
                await wallet.useRecoveryMethod(alice.config);

                await run(wallet, { prepareOnly: true });

                expect(approver(api)).toBe(recoveryQuorum.locator);
            });

            it("signs nothing with prepareOnly", async () => {
                const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
                await wallet.useRecoveryMethod(alice.config);

                await run(wallet, { prepareOnly: true });

                expect(api.approveTransaction).not.toHaveBeenCalled();
                expect((alice.config as unknown as { onSign: ReturnType<typeof vi.fn> }).onSign).not.toHaveBeenCalled();
            });

            it("sends the explicit signer instead, when one is passed", async () => {
                const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
                await wallet.useRecoveryMethod(alice.config);

                await run(wallet, { prepareOnly: true, signer: "api-key" });

                expect(approver(api)).toBe("api-key");
            });
        });

        describe("when the selected member is in two recovery quorums", () => {
            it("throws QuorumSelectionAmbiguousError naming both, and sends nothing", async () => {
                const first = createQuorumApiEntryWith([alice.member]);
                const second = createQuorumApiEntryWith([alice.member]);
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, first, second]);
                await wallet.useRecoveryMethod(alice.config);

                const changing = run(wallet, { prepareOnly: true });

                await expect(changing).rejects.toBeInstanceOf(QuorumSelectionAmbiguousError);
                await expect(changing).rejects.toMatchObject({ quorumLocators: [first.locator, second.locator] });
                expect(called(api)).toBe(false);
            });

            it("sends the quorum the signer option names", async () => {
                const first = createQuorumApiEntryWith([alice.member]);
                const second = createQuorumApiEntryWith([alice.member]);
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, first, second]);
                await wallet.useRecoveryMethod(alice.config);

                await run(wallet, { prepareOnly: true, signer: first.locator });

                expect(approver(api)).toBe(first.locator);
            });
        });

        describe("when the signer option names one of the wallet's recovery methods", () => {
            it("sends that recovery method as the approver, not the default one", async () => {
                const other = {
                    type: "external-wallet",
                    address: BOB[chain],
                    onSign: vi.fn(async (payload: string) => signatureOver(payload)),
                };
                const otherLocator = `external-wallet:${BOB[chain]}`;
                const wallet = await walletWithRecovery(chain, api, [
                    { type: "api-key" },
                    other,
                    createQuorumApiEntryWith([alice.member]),
                ]);

                await run(wallet, { prepareOnly: true, signer: otherLocator });

                expect(approver(api)).toBe(otherLocator);
            });
        });

        describe("when the signer option names a delegated quorum", () => {
            it("sends it as given, for the API to accept or reject", async () => {
                const delegated = createQuorumApiEntry();
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, createQuorumApiEntry()]);

                await run(wallet, { prepareOnly: true, signer: delegated.locator });

                expect(approver(api)).toBe(delegated.locator);
            });
        });

        describe("when every recovery method is a quorum and nothing is selected", () => {
            it("throws RecoveryMethodRequiredError and sends nothing", async () => {
                const wallet = await walletWithRecovery(chain, api, [createQuorumApiEntryWith([alice.member])]);

                await expect(run(wallet, { prepareOnly: true })).rejects.toBeInstanceOf(RecoveryMethodRequiredError);
                expect(called(api)).toBe(false);
            });
        });

        describe("when the signer option names a quorum and this client holds no key", () => {
            it("throws RecoveryMethodRequiredError and sends nothing, even with prepareOnly", async () => {
                const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
                const wallet = await createMockWalletWithoutSigner(chain, api, [
                    { type: "external-wallet", address: BOB[chain] },
                    recoveryQuorum,
                ] as unknown as RecoverySignerConfigForChain<Chain>[]);

                await expect(run(wallet, { prepareOnly: true, signer: recoveryQuorum.locator })).rejects.toBeInstanceOf(
                    RecoveryMethodRequiredError
                );
                expect(called(api)).toBe(false);
            });
        });

        describe("when nothing is selected and no signer option is passed", () => {
            it("sends the default recovery method as before", async () => {
                const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, createQuorumApiEntry()]);

                await run(wallet, { prepareOnly: true });

                expect(approver(api)).toBe("api-key");
            });
        });
    });

    describe("useRecoveryMethod()", () => {
        it("selects a key that is a recovery method and also a member as the recovery method", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
            const wallet = await walletWithRecovery(chain, api, [
                { type: "api-key" },
                { type: "external-wallet", address: ALICE[chain] },
                recoveryQuorum,
            ]);
            await wallet.useRecoveryMethod(alice.config);

            await paths[0].run(wallet, { prepareOnly: true });

            expect(paths[0].approver(api)).toBe(alice.member.locator);
        });

        it("rejects a key that is only a member of a delegated quorum", async () => {
            const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, createQuorumApiEntry()]);
            vi.spyOn(wallet, "signers").mockResolvedValue([
                { ...createQuorumApiEntryWith([alice.member]), status: "success" },
            ] as never);

            await expect(wallet.useRecoveryMethod(alice.config)).rejects.toBeInstanceOf(InvalidRecoveryConfigError);
        });
    });
});

// Members sign on Stellar and EVM with the plain external-wallet test key (Solana approvals sign transaction bytes).
describe.each([
    { chain: "stellar" as const, paths: PATHS },
    { chain: "base-sepolia" as const, paths: PATHS.slice(0, 2) },
])("signer changes signed by a held member on $chain", ({ chain, paths }) => {
    let api: MockedApiClient;
    const alice = memberKey(ALICE[chain]);
    const registered = CHAINS.find((entry) => entry.chain === chain)?.registered ?? {};
    const SUCCESS = {
        id: "txn-change",
        status: "success",
        onChain: { txId: "0xhash", txHash: "stellar-hash", explorerLink: "https://explorer.example/tx" },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        mockSignerChangeResponses(api, registered);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe.each(paths)("$name", ({ run }) => {
        it("signs the selected member's approval and lands when it completes the quorum", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
            const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
            await wallet.useRecoveryMethod(alice.config);
            const entry = createQuorumPendingApproval({ quorum: recoveryQuorum });
            api.getTransaction.mockResolvedValueOnce(awaiting([entry], CHAIN_TYPES[chain]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            const { error } = await settle(run(wallet, {}));

            expect(error).toBeUndefined();
            expect(api.approveTransaction.mock.calls.map((call) => call[2].approvals)).toEqual([
                [{ signer: alice.member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
        });

        it("throws the awaiting error and leaves the recovery methods unchanged while other members must sign", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
            const [, ...others] = recoveryQuorum.members;
            const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
            await wallet.useRecoveryMethod(alice.config);
            const recoveryBefore = [...wallet.recoveryMethods];
            api.getTransaction.mockResolvedValueOnce(
                awaiting([createQuorumPendingApproval({ quorum: recoveryQuorum })], CHAIN_TYPES[chain]) as never
            );
            api.getTransaction.mockResolvedValue(
                awaiting(
                    [
                        createQuorumPendingApproval({
                            quorum: recoveryQuorum,
                            pending: others,
                            submitted: [alice.member],
                            remaining: 1,
                        }),
                    ],
                    CHAIN_TYPES[chain]
                ) as never
            );

            const activeBefore = wallet.signer?.locator();

            const { error } = await settle(run(wallet, {}));

            expect(wallet.signer?.locator()).toBe(activeBefore);
            expect(error).toBeInstanceOf(TransactionAwaitingApprovalError);
            expect((error as TransactionAwaitingApprovalError).quorums?.[0]?.quorum).toBe(recoveryQuorum.locator);
            expect(wallet.recoveryMethods).toEqual(recoveryBefore);
        });
    });

    describe("when another member approves with useRecoveryMethod", () => {
        it("signs that member's pending entry", async () => {
            const bob = memberKey(BOB[chain]);
            const recoveryQuorum = createQuorumApiEntryWith([alice.member, bob.member]);
            const wallet = await walletWithRecovery(chain, api, [{ type: "api-key" }, recoveryQuorum]);
            await wallet.useRecoveryMethod(bob.config);
            const entry = createQuorumPendingApproval({
                quorum: recoveryQuorum,
                pending: [bob.member, recoveryQuorum.members[2]],
                submitted: [alice.member],
                remaining: 1,
            });
            api.getTransaction.mockResolvedValueOnce(awaiting([entry], CHAIN_TYPES[chain]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-change" }));

            expect(api.approveTransaction.mock.calls.map((call) => call[2].approvals)).toEqual([
                [{ signer: bob.member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
        });
    });
});

describe.each(["stellar", "base-sepolia"] as const)("keys that sign a quorum-approved change on %s", (chain) => {
    let api: MockedApiClient;
    const alice = memberKey(ALICE[chain]);
    const active = activeSignerMember(chain);
    const SUCCESS = {
        id: "txn-change",
        status: "success",
        onChain: { txId: "0xhash", txHash: "stellar-hash", explorerLink: "https://explorer.example/tx" },
    };
    const removeDelegated = (wallet: Wallet<Chain>, options: object) =>
        wallet.removeSigner({ type: "external-wallet", address: "Delegated333" } as never, options as never);
    const sentApprovals = () => api.approveTransaction.mock.calls.map((call) => call[2].approvals);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        mockSignerChangeResponses(api, CHAINS.find((entry) => entry.chain === chain)?.registered ?? {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("when a member is selected and the active key is a member too", () => {
        it("signs both members' entries", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([alice.member, active]);
            const wallet = await createSigningWallet(chain, api, [
                { type: "api-key" },
                recoveryQuorum,
            ] as unknown as RecoverySignerConfigForChain<Chain>[]);
            await wallet.useRecoveryMethod(alice.config);
            const entry = createQuorumPendingApproval({ quorum: recoveryQuorum });
            api.getTransaction.mockResolvedValueOnce(awaiting([entry], CHAIN_TYPES[chain]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(removeDelegated(wallet, {}));

            const [aliceEntry, activeEntry] = entry.quorumApprovals.pending;
            expect(sentApprovals()).toEqual([
                [
                    { signer: alice.member.locator, signature: signatureOver(aliceEntry.message) },
                    { signer: active.locator, signature: signatureOver(activeEntry.message) },
                ],
            ]);
        });
    });

    describe("when the signer option names a quorum the active key is a member of", () => {
        it("signs the active key's entry", async () => {
            const recoveryQuorum = createQuorumApiEntryWith([active]);
            const wallet = await createSigningWallet(chain, api, [
                { type: "api-key" },
                recoveryQuorum,
            ] as unknown as RecoverySignerConfigForChain<Chain>[]);
            const entry = createQuorumPendingApproval({ quorum: recoveryQuorum });
            api.getTransaction.mockResolvedValueOnce(awaiting([entry], CHAIN_TYPES[chain]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(removeDelegated(wallet, { signer: recoveryQuorum.locator }));

            expect(sentApprovals()).toEqual([
                [{ signer: active.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
        });
    });

    describe("when the signer option names one of the wallet's recovery methods", () => {
        it("signs its flat entry with that recovery method", async () => {
            const other = {
                type: "external-wallet",
                address: BOB[chain],
                onSign: vi.fn(async (payload: string) => signatureOver(payload)),
            };
            const otherLocator = `external-wallet:${BOB[chain]}`;
            const wallet = await walletWithRecovery(chain, api, [
                { type: "api-key" },
                other,
                createQuorumApiEntryWith([alice.member]),
            ]);
            const flat = { signer: { type: "external-wallet", locator: otherLocator }, message: "0xflat" };
            api.getTransaction.mockResolvedValueOnce(awaiting([flat], CHAIN_TYPES[chain]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(removeDelegated(wallet, { signer: otherLocator }));

            expect(sentApprovals()).toEqual([[{ signer: otherLocator, signature: signatureOver("0xflat") }]]);
        });
    });
});

describe("a selected member that becomes a recovery method of its own", () => {
    it("approves later signer changes as itself", async () => {
        vi.useFakeTimers();
        const api = createMockApiClient();
        mockSignerChangeResponses(api, CHAINS[1].registered);
        const alice = memberKey(ALICE.stellar);
        const recoveryQuorum = createQuorumApiEntryWith([alice.member], { threshold: 1 });
        const wallet = await walletWithRecovery("stellar", api, [{ type: "api-key" }, recoveryQuorum]);
        await wallet.useRecoveryMethod(alice.config);
        api.getTransaction.mockResolvedValueOnce(
            awaiting([createQuorumPendingApproval({ quorum: recoveryQuorum })], "stellar") as never
        );
        api.getTransaction.mockResolvedValue({
            id: "txn-change",
            status: "success",
            onChain: { txHash: "stellar-hash", explorerLink: "https://explorer.example/tx" },
        } as never);
        await settle(wallet.addRecoveryMethod({ type: "external-wallet", address: ALICE.stellar } as never));
        api.removeSigner.mockClear();

        await wallet.removeSigner({ type: "external-wallet", address: "Delegated333" } as never, {
            prepareOnly: true,
        });

        expect(api.removeSigner.mock.calls[0][2].approver).toBe(alice.member.locator);
        vi.useRealTimers();
        vi.restoreAllMocks();
    });
});

describe("addSigner resuming a registration that a recovery quorum approves", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("signs the selected member's pending entry", async () => {
        const api = createMockApiClient();
        const alice = memberKey(ALICE.stellar);
        const recoveryQuorum = createQuorumApiEntryWith([alice.member]);
        const wallet = await walletWithRecovery("stellar", api, [{ type: "api-key" }, recoveryQuorum]);
        await wallet.useRecoveryMethod(alice.config);
        api.getSigner.mockResolvedValue({
            ...REGISTERED,
            transaction: { id: "txn-change", status: "awaiting-approval" },
        } as never);
        api.approveTransaction.mockResolvedValue({ id: "txn-change", status: "pending" } as never);
        const entry = createQuorumPendingApproval({ quorum: recoveryQuorum });
        api.getTransaction.mockResolvedValueOnce(awaiting([entry], "stellar") as never);
        api.getTransaction.mockResolvedValue({
            id: "txn-change",
            status: "success",
            onChain: { txHash: "stellar-hash", explorerLink: "https://explorer.example/tx" },
        } as never);

        const { error } = await settle(wallet.addSigner({ type: "external-wallet", address: "NewSigner444" } as never));

        expect(error).toBeUndefined();
        expect(api.registerSigner).not.toHaveBeenCalled();
        expect(api.approveTransaction.mock.calls.map((call) => call[2].approvals)).toEqual([
            [{ signer: alice.member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
        ]);
    });
});
