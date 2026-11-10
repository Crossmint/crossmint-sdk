import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import {
    InvalidSignerError,
    QuorumSignerNotSupportedError,
    SignatureFailedError,
    TransactionAwaitingApprovalError,
    TransactionExpiredError,
    TransactionFailedError,
} from "../utils/errors";
import { Base64, Hex } from "ox";
import type { Wallet } from "./wallet";
import {
    activeSignerMember,
    createExpiredRequest,
    createHeldSigner,
    createMockApiClient,
    createMockWallet,
    createQuorumApiEntry,
    createQuorumPendingApproval,
    createSigningWallet,
    randomStellarMessage,
    settle,
    signatureOver,
    TRANSACTION_EXPIRED_API_MESSAGE,
    type MockedApiClient,
} from "./__tests__/test-helpers";

const RECIPIENT = "0x1111111111111111111111111111111111111111";
const SUCCESS = {
    id: "txn-1",
    status: "success",
    onChain: { txId: "0xhash", explorerLink: "https://explorer.example/tx/0xhash" },
};
// What approve() returns while other members must still sign (EDD 007 §7 "Approval").
const AWAITING_TRANSACTION = { hash: undefined, explorerLink: undefined, transactionId: "txn-1" };
const AWAITING_SIGNATURE = { signature: undefined, signatureId: "sig-1" };

// A quorum of `threshold` whose first members are `members`, the rest random email members.
function quorumWith(members: QuorumMember[], { threshold = 2, memberCount = 3 } = {}) {
    const quorum = createQuorumApiEntry({ threshold, memberCount });
    return { ...quorum, members: [...members, ...quorum.members.slice(members.length)] };
}

const awaiting = (id: string, pending: object[], chainType = "evm") => ({
    id,
    status: "awaiting-approval",
    chainType,
    approvals: { pending, submitted: [] },
});

const sentApprovals = (api: MockedApiClient) => api.approveTransaction.mock.calls.map((call) => call[2].approvals);

describe("approve() on a transaction with a pending quorum entry", () => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;
    const member = activeSignerMember("base-sepolia");

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
        wallet = await createSigningWallet("base-sepolia", api);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("when this client holds a pending member", () => {
        it("signs that member's own message and approves as the member", async () => {
            const quorum = quorumWith([member]);
            const entry = createQuorumPendingApproval({ quorum });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1" }));

            const memberMessage = entry.quorumApprovals.pending[0].message;
            expect(sentApprovals(api)).toEqual([[{ signer: member.locator, signature: signatureOver(memberMessage) }]]);
        });

        it("returns the landed transaction when this client's approval completes the quorum", async () => {
            const entry = createQuorumPendingApproval({ quorum: quorumWith([member]) });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(value).toEqual({
                hash: "0xhash",
                explorerLink: "https://explorer.example/tx/0xhash",
                transactionId: "txn-1",
            });
        });

        it("returns the transaction id without a hash when other members must still sign", async () => {
            const quorum = quorumWith([member], { threshold: 2 });
            const [, ...others] = quorum.members;
            api.getTransaction.mockResolvedValueOnce(
                awaiting("txn-1", [createQuorumPendingApproval({ quorum })]) as never
            );
            api.getTransaction.mockResolvedValue(
                awaiting("txn-1", [
                    createQuorumPendingApproval({ quorum, pending: others, submitted: [member], remaining: 1 }),
                ]) as never
            );

            const { value, error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeUndefined();
            expect(sentApprovals(api)).toHaveLength(1);
            expect(value).toStrictEqual(AWAITING_TRANSACTION);
        });
    });

    describe("when this client holds no pending member", () => {
        it("sends no approval and returns the transaction id without a hash", async () => {
            const pending = [createQuorumPendingApproval({ quorum: createQuorumApiEntry() })];
            api.getTransaction.mockResolvedValue(awaiting("txn-1", pending) as never);

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(AWAITING_TRANSACTION);
        });
    });

    describe("when two approve() calls run at the same time for one request", () => {
        it("signs the member once, sends one approval, and gives both calls the same result", async () => {
            const entry = createQuorumPendingApproval({ quorum: quorumWith([member]) });
            // Both calls read the request before either approval lands.
            api.getTransaction
                .mockResolvedValueOnce(awaiting("txn-1", [entry]) as never)
                .mockResolvedValueOnce(awaiting("txn-1", [entry]) as never)
                .mockResolvedValue(SUCCESS as never);

            const [first, second] = await Promise.all([
                settle(wallet.approve({ transactionId: "txn-1" })),
                settle(wallet.approve({ transactionId: "txn-1" })),
            ]);

            expect(first.error).toBeUndefined();
            expect(second).toEqual(first);
            expect(sentApprovals(api)).toHaveLength(1);
        });
    });

    describe("when approve() runs again after this client's member signed", () => {
        it("sends nothing for the member that already signed", async () => {
            const quorum = quorumWith([member]);
            const [, ...others] = quorum.members;
            const signedEntry = createQuorumPendingApproval({
                quorum,
                pending: others,
                submitted: [member],
                remaining: 1,
            });
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [signedEntry]) as never);

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(AWAITING_TRANSACTION);
        });
    });

    describe("when this client holds several pending members of one quorum", () => {
        it("signs every held member, even past the approvals the quorum still needs", async () => {
            const second = createQuorumApiEntry().members[0];
            const quorum = quorumWith([member, second], { threshold: 2 });
            const entry = createQuorumPendingApproval({
                quorum,
                pending: [member, second],
                submitted: [quorum.members[2]],
                remaining: 1,
            });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(
                wallet.approve({
                    transactionId: "txn-1",
                    options: { additionalSigners: [createHeldSigner(second.locator)] },
                })
            );

            const [memberEntry, secondEntry] = entry.quorumApprovals.pending;
            expect(sentApprovals(api)).toEqual([
                [
                    { signer: member.locator, signature: signatureOver(memberEntry.message) },
                    { signer: second.locator, signature: signatureOver(secondEntry.message) },
                ],
            ]);
        });
    });

    describe("when a held member is pending in two different quorums", () => {
        it("throws the API's rejection, which the API returns for a member shared by two quorums", async () => {
            const first = createQuorumPendingApproval({ quorum: quorumWith([member]) });
            const second = createQuorumPendingApproval({ quorum: quorumWith([member]) });
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [first, second]) as never);
            const rejection = `Signer '${member.locator}' belongs to multiple quorums, which is not supported`;
            api.approveTransaction.mockResolvedValue({ error: true, statusCode: 422, message: rejection } as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(TransactionFailedError);
            expect((error as Error).message).toContain("belongs to multiple quorums");
        });
    });

    describe("when a flat entry and a quorum entry are pending", () => {
        it("throws InvalidSignerError and sends nothing when the flat signer is not held", async () => {
            const flat = { signer: { type: "email", locator: "email:stranger@example.com" }, message: "0xflat" };
            const quorumEntry = createQuorumPendingApproval({ quorum: quorumWith([member]) });
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [flat, quorumEntry]) as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(InvalidSignerError);
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });

        it("signs only the flat entry when the quorum needs no more approvals", async () => {
            const quorum = quorumWith([member]);
            const satisfied = createQuorumPendingApproval({ quorum, remaining: 0 });
            const flat = { signer: { type: member.type, locator: member.locator }, message: "0xflat" };
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [flat, satisfied]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(sentApprovals(api)).toEqual([[{ signer: member.locator, signature: signatureOver("0xflat") }]]);
        });
    });

    describe("when the API answers the approval with TRANSACTION_EXPIRED", () => {
        it("throws TransactionExpiredError", async () => {
            api.getTransaction.mockResolvedValue(
                awaiting("txn-1", [createQuorumPendingApproval({ quorum: quorumWith([member]) })]) as never
            );
            api.approveTransaction.mockResolvedValue({
                error: true,
                statusCode: 422,
                code: "TRANSACTION_EXPIRED",
                message: TRANSACTION_EXPIRED_API_MESSAGE,
            } as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(TransactionExpiredError);
        });
    });

    describe("when the member already signed from another device with a different signature", () => {
        it("throws the API's rejection", async () => {
            api.getTransaction.mockResolvedValue(
                awaiting("txn-1", [createQuorumPendingApproval({ quorum: quorumWith([member]) })]) as never
            );
            api.approveTransaction.mockResolvedValue({
                error: true,
                statusCode: 409,
                message: "Member already approved with a different signature",
            } as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(TransactionFailedError);
        });
    });

    describe("when an approval is passed in options", () => {
        it("submits it as given and signs nothing", async () => {
            const approval = { signer: member.locator, signature: "0xexternal" };
            api.getTransaction.mockResolvedValueOnce(
                awaiting("txn-1", [createQuorumPendingApproval({ quorum: quorumWith([member]) })]) as never
            );
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1", options: { approval } }));

            expect(sentApprovals(api)).toEqual([[approval]]);
        });
    });

    describe("when only a flat entry for the useRecoveryMethod key is pending", () => {
        it("throws InvalidSignerError, as before", async () => {
            const recoveryAddress = "0x3333333333333333333333333333333333333333";
            wallet = await createSigningWallet("base-sepolia", api, [
                { type: "api-key" },
                { type: "external-wallet", address: recoveryAddress },
            ] as unknown as RecoverySignerConfigForChain<Chain>[]);
            await wallet.useRecoveryMethod({
                type: "external-wallet",
                address: recoveryAddress,
                onSign: vi.fn(async (payload: string) => signatureOver(payload)),
            } as unknown as SignerConfigForChain<Chain>);
            const flat = {
                signer: { type: "external-wallet", locator: `external-wallet:${recoveryAddress}` },
                message: "0xflat",
            };
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [flat]) as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(InvalidSignerError);
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });
    });

    describe("when a flat entry for the useRecoveryMethod key is pending next to a quorum entry", () => {
        it("signs that flat entry with the key too, since the held keys then include it", async () => {
            const recoveryAddress = "0x3333333333333333333333333333333333333333";
            wallet = await createSigningWallet("base-sepolia", api, [
                { type: "api-key" },
                { type: "external-wallet", address: recoveryAddress },
            ] as unknown as RecoverySignerConfigForChain<Chain>[]);
            await wallet.useRecoveryMethod({
                type: "external-wallet",
                address: recoveryAddress,
                onSign: vi.fn(async (payload: string) => signatureOver(payload)),
            } as unknown as SignerConfigForChain<Chain>);
            const recoveryLocator = `external-wallet:${recoveryAddress}`;
            const flat = { signer: { type: "external-wallet", locator: recoveryLocator }, message: "0xflat" };
            const entry = createQuorumPendingApproval({ quorum: quorumWith([member]) });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [flat, entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(sentApprovals(api)).toEqual([
                [
                    { signer: recoveryLocator, signature: signatureOver("0xflat") },
                    { signer: member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) },
                ],
            ]);
        });
    });

    describe("when the recovery method selected with useRecoveryMethod is a pending member", () => {
        it("signs as that member", async () => {
            const recovery = {
                type: "external-wallet",
                address: "0x3333333333333333333333333333333333333333",
                onSign: vi.fn(async (payload: string) => signatureOver(payload)),
            };
            const recoveryLocator = `external-wallet:${recovery.address}`;
            wallet = await createSigningWallet("base-sepolia", api, [
                { type: "api-key" },
                { type: "external-wallet", address: recovery.address },
            ] as unknown as RecoverySignerConfigForChain<Chain>[]);
            await wallet.useRecoveryMethod(recovery as unknown as SignerConfigForChain<Chain>);
            const recoveryMember = { type: "external-wallet", address: recovery.address, locator: recoveryLocator };
            const entry = createQuorumPendingApproval({ quorum: quorumWith([recoveryMember as QuorumMember]) });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(sentApprovals(api)).toEqual([
                [{ signer: recoveryLocator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
        });
    });
});

describe("approve() with an api-key active signer", () => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
        wallet = await createMockWallet("base-sepolia", api, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("when a quorum entry is pending", () => {
        it("signs the held members passed in additionalSigners", async () => {
            const held = createQuorumApiEntry().members[0];
            const entry = createQuorumPendingApproval({ quorum: quorumWith([held]) });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            await settle(
                wallet.approve({
                    transactionId: "txn-1",
                    options: { additionalSigners: [createHeldSigner(held.locator)] },
                })
            );

            expect(sentApprovals(api)).toEqual([
                [{ signer: held.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
            ]);
        });

        describe("and a flat entry is pending next to it", () => {
            it("signs only the quorum members, leaving the flat entry to the API", async () => {
                const held = createQuorumApiEntry().members[0];
                const flat = { signer: { type: "api-key", locator: "api-key" }, message: "0xflat" };
                const entry = createQuorumPendingApproval({ quorum: quorumWith([held]) });
                api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [flat, entry]) as never);
                api.getTransaction.mockResolvedValue(SUCCESS as never);

                const { error } = await settle(
                    wallet.approve({
                        transactionId: "txn-1",
                        options: { additionalSigners: [createHeldSigner(held.locator)] },
                    })
                );

                expect(error).toBeUndefined();
                expect(sentApprovals(api)).toEqual([
                    [{ signer: held.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
                ]);
            });
        });

        describe("and the request is a signature with a flat entry next to it", () => {
            it("signs only the quorum members, leaving the flat entry to the API", async () => {
                const held = createQuorumApiEntry().members[0];
                const flat = { signer: { type: "api-key", locator: "api-key" }, message: "0xflat" };
                const entry = createQuorumPendingApproval({ quorum: quorumWith([held]) });
                api.getSignature.mockResolvedValue(awaiting("sig-1", [flat, entry]) as never);
                api.approveSignature.mockResolvedValue({
                    id: "sig-1",
                    status: "success",
                    outputSignature: "0xerc1271",
                } as never);

                const { value } = await settle(
                    wallet.approve({
                        signatureId: "sig-1",
                        options: { additionalSigners: [createHeldSigner(held.locator)] },
                    })
                );

                expect(api.approveSignature.mock.calls.map((call) => call[2].approvals)).toEqual([
                    [{ signer: held.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
                ]);
                expect(value).toEqual({ signature: "0xerc1271", signatureId: "sig-1" });
            });
        });

        describe("and no member is held", () => {
            it("sends nothing and returns the transaction id without a hash", async () => {
                api.getTransaction.mockResolvedValue(
                    awaiting("txn-1", [createQuorumPendingApproval({ quorum: createQuorumApiEntry() })]) as never
                );

                const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

                expect(api.approveTransaction).not.toHaveBeenCalled();
                expect(value).toStrictEqual(AWAITING_TRANSACTION);
            });
        });

        describe("and a flat entry still waits next to it after this client's approvals", () => {
            it("throws TransactionAwaitingApprovalError with the transaction id, as before", async () => {
                const held = createQuorumApiEntry().members[0];
                const flat = { signer: { type: "api-key", locator: "api-key" }, message: "0xflat" };
                const quorum = quorumWith([held]);
                api.getTransaction.mockResolvedValueOnce(
                    awaiting("txn-1", [flat, createQuorumPendingApproval({ quorum })]) as never
                );
                api.getTransaction.mockResolvedValue(
                    awaiting("txn-1", [
                        flat,
                        createQuorumPendingApproval({
                            quorum,
                            pending: quorum.members.slice(1),
                            submitted: [held],
                            remaining: 1,
                        }),
                    ]) as never
                );

                const { error } = await settle(
                    wallet.approve({
                        transactionId: "txn-1",
                        options: { additionalSigners: [createHeldSigner(held.locator)] },
                    })
                );

                expect(sentApprovals(api)).toHaveLength(1);
                expect(error).toBeInstanceOf(TransactionAwaitingApprovalError);
                expect(error).toMatchObject({ transactionId: "txn-1" });
            });
        });
    });

    describe("when only flat entries are pending", () => {
        it("approves nothing itself, as before", async () => {
            const flat = { signer: { type: "api-key", locator: "api-key" }, message: "0xflat" };
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [flat]) as never);
            api.getTransaction.mockResolvedValue(SUCCESS as never);

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toMatchObject({ transactionId: "txn-1", hash: "0xhash" });
        });
    });
});

describe("approve() with an api-key active signer on a chain without quorum approvals", () => {
    it("leaves a pending quorum entry to the API and sends nothing, as before", async () => {
        vi.useFakeTimers();
        const api = createMockApiClient();
        const wallet = await createMockWallet("solana", api, "api-key");
        const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry() });
        api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry], "solana") as never);
        api.getTransaction.mockResolvedValue(SUCCESS as never);

        const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

        expect(error).toBeUndefined();
        expect(api.approveTransaction).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it("returns the transaction id without a hash while only the quorum can still approve, as on other chains", async () => {
        vi.useFakeTimers();
        const api = createMockApiClient();
        const wallet = await createMockWallet("solana", api, "api-key");
        const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry() });
        api.getTransaction.mockResolvedValue(awaiting("txn-1", [entry], "solana") as never);

        const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

        expect(api.approveTransaction).not.toHaveBeenCalled();
        expect(value).toStrictEqual(AWAITING_TRANSACTION);
        vi.useRealTimers();
    });
});

describe("send() with a quorum as signer, then approve()", () => {
    it("creates the transaction as the quorum unsigned; approve() signs this client's pending member", async () => {
        vi.useFakeTimers();
        const api = createMockApiClient();
        const wallet = await createSigningWallet("base-sepolia", api);
        const member = activeSignerMember("base-sepolia");
        const quorum = quorumWith([member]);
        const entry = createQuorumPendingApproval({ quorum });
        api.send.mockResolvedValue({ id: "txn-1" } as never);
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
        api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry]) as never);
        api.getTransaction.mockResolvedValue(SUCCESS as never);

        const sent = await wallet.send(RECIPIENT, "usdc", "1", { signer: quorum.locator, prepareOnly: true });

        expect(api.send.mock.calls[0][2]).toMatchObject({ signer: quorum.locator });
        expect(sent).toMatchObject({ transactionId: "txn-1", hash: undefined });
        expect(api.approveTransaction).not.toHaveBeenCalled();

        const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

        expect(sentApprovals(api)).toEqual([
            [{ signer: member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
        ]);
        expect(value).toMatchObject({ transactionId: "txn-1", hash: "0xhash" });
        vi.useRealTimers();
    });
});

describe("approve() on a Solana transaction with a pending quorum entry", () => {
    it("throws QuorumSignerNotSupportedError and signs nothing, since Solana has no quorum approvals", async () => {
        vi.useFakeTimers();
        const api = createMockApiClient();
        const wallet = await createSigningWallet("solana", api);
        const entry = createQuorumPendingApproval({ quorum: quorumWith([activeSignerMember("solana")]) });
        api.getTransaction.mockResolvedValue(awaiting("txn-1", [entry], "solana") as never);

        const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

        expect(error).toBeInstanceOf(QuorumSignerNotSupportedError);
        expect(api.approveTransaction).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});

describe("approve() on a Stellar transaction with pending quorum entries", () => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;
    const member = activeSignerMember("stellar");
    const STELLAR_SUCCESS = {
        id: "txn-1",
        status: "success",
        onChain: { txHash: "stellar-hash", explorerLink: "https://stellar.expert/explorer/testnet/tx/stellar-hash" },
    };
    // The API sends one quorum entry per auth entry, each member message the base64 of 32 bytes.
    const stellarEntry = (options: Parameters<typeof createQuorumPendingApproval>[0]) =>
        createQuorumPendingApproval({ ...options, createMessage: randomStellarMessage });
    const memberMessage = (entry: ReturnType<typeof stellarEntry>, index = 0) =>
        entry.quorumApprovals.pending[index].message;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
        wallet = await createSigningWallet("stellar", api);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("when this client's member is pending", () => {
        it("signs the member's message as given and returns the landed transaction", async () => {
            const entry = stellarEntry({ quorum: quorumWith([member]) });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry], "stellar") as never);
            api.getTransaction.mockResolvedValue(STELLAR_SUCCESS as never);

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(sentApprovals(api)).toEqual([
                [{ signer: member.locator, signature: signatureOver(memberMessage(entry)) }],
            ]);
            expect(value).toEqual({
                hash: "stellar-hash",
                explorerLink: STELLAR_SUCCESS.onChain.explorerLink,
                transactionId: "txn-1",
            });
        });
    });

    describe("when the quorum waits on two auth entries", () => {
        it("signs each entry's own message as the member and sends both approvals in one request", async () => {
            const quorum = quorumWith([member]);
            const first = stellarEntry({ quorum });
            const second = stellarEntry({ quorum });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [first, second], "stellar") as never);
            api.getTransaction.mockResolvedValue(STELLAR_SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(sentApprovals(api)).toEqual([
                [
                    { signer: member.locator, signature: signatureOver(memberMessage(first)) },
                    { signer: member.locator, signature: signatureOver(memberMessage(second)) },
                ],
            ]);
        });
    });

    describe("when a held passkey member is pending on two auth entries", () => {
        it("signs each message's 32 bytes as hex, one prompt after the other", async () => {
            const passkey = { type: "passkey", id: "cred-1", locator: "passkey:cred-1" } as unknown as QuorumMember;
            const quorum = quorumWith([passkey]);
            const first = stellarEntry({ quorum });
            const second = stellarEntry({ quorum });
            const held = createHeldSigner(passkey.locator);
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [first, second], "stellar") as never);
            api.getTransaction.mockResolvedValue(STELLAR_SUCCESS as never);

            await settle(wallet.approve({ transactionId: "txn-1", options: { additionalSigners: [held] } }));

            const asHex = (message: string) => Hex.fromBytes(Base64.toBytes(message));
            expect(vi.mocked(held.signTransaction).mock.calls).toEqual([
                [asHex(memberMessage(first))],
                [asHex(memberMessage(second))],
            ]);
            expect(sentApprovals(api)).toEqual([
                [
                    { signer: passkey.locator, signature: signatureOver(asHex(memberMessage(first))) },
                    { signer: passkey.locator, signature: signatureOver(asHex(memberMessage(second))) },
                ],
            ]);
        });
    });

    describe("when a held email member is pending", () => {
        it("signs the member's message as given", async () => {
            const email = createQuorumApiEntry().members[0];
            const entry = stellarEntry({ quorum: quorumWith([email]) });
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry], "stellar") as never);
            api.getTransaction.mockResolvedValue(STELLAR_SUCCESS as never);

            await settle(
                wallet.approve({
                    transactionId: "txn-1",
                    options: { additionalSigners: [createHeldSigner(email.locator)] },
                })
            );

            expect(sentApprovals(api)).toEqual([
                [{ signer: email.locator, signature: signatureOver(memberMessage(entry)) }],
            ]);
        });
    });

    describe("when other members must still sign after this client's approval", () => {
        it("returns the transaction id without a hash", async () => {
            const quorum = quorumWith([member]);
            api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [stellarEntry({ quorum })], "stellar") as never);
            api.getTransaction.mockResolvedValue(
                awaiting(
                    "txn-1",
                    [stellarEntry({ quorum, pending: quorum.members.slice(1), submitted: [member], remaining: 1 })],
                    "stellar"
                ) as never
            );

            const { value, error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeUndefined();
            expect(sentApprovals(api)).toHaveLength(1);
            expect(value).toStrictEqual(AWAITING_TRANSACTION);
        });
    });

    describe("when another member completes the quorum first", () => {
        it("returns the landed transaction the API client reads back after the 422", async () => {
            api.getTransaction.mockResolvedValueOnce(
                awaiting("txn-1", [stellarEntry({ quorum: quorumWith([member]) })], "stellar") as never
            );
            api.approveTransaction.mockResolvedValue(STELLAR_SUCCESS as never);
            api.getTransaction.mockResolvedValue(STELLAR_SUCCESS as never);

            const { value, error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeUndefined();
            expect(value).toEqual({
                hash: "stellar-hash",
                explorerLink: STELLAR_SUCCESS.onChain.explorerLink,
                transactionId: "txn-1",
            });
        });
    });

    describe("when approve() runs again after this client's member signed every entry", () => {
        it("sends nothing and returns the transaction id without a hash", async () => {
            const quorum = quorumWith([member]);
            const signed = () =>
                stellarEntry({ quorum, pending: quorum.members.slice(1), submitted: [member], remaining: 1 });
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [signed(), signed()], "stellar") as never);

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(AWAITING_TRANSACTION);
        });
    });

    describe("when a flat entry for a signer this client does not hold is pending next to the quorum entry", () => {
        it("throws InvalidSignerError and sends nothing", async () => {
            const flat = {
                signer: { type: "external-wallet", locator: "external-wallet:GSTRANGER" },
                message: randomStellarMessage(),
            };
            const entry = stellarEntry({ quorum: quorumWith([member]) });
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [flat, entry], "stellar") as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(InvalidSignerError);
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });
    });

    describe("when the API answers the approval with TRANSACTION_EXPIRED", () => {
        it("throws TransactionExpiredError with the transaction id", async () => {
            api.getTransaction.mockResolvedValue(
                awaiting("txn-1", [stellarEntry({ quorum: quorumWith([member]) })], "stellar") as never
            );
            api.approveTransaction.mockResolvedValue({
                error: true,
                statusCode: 422,
                code: "TRANSACTION_EXPIRED",
                message: TRANSACTION_EXPIRED_API_MESSAGE,
            } as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect(error).toMatchObject({ transactionId: "txn-1" });
        });
    });

    describe("when the transaction expires while waiting for other members", () => {
        it("throws TransactionExpiredError with the transaction id", async () => {
            api.getTransaction.mockResolvedValueOnce(
                awaiting("txn-1", [stellarEntry({ quorum: quorumWith([member]) })], "stellar") as never
            );
            api.getTransaction.mockResolvedValue(createExpiredRequest("txn-1") as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(sentApprovals(api)).toHaveLength(1);
            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect(error).toMatchObject({ transactionId: "txn-1" });
        });
    });

    describe("with an api-key active signer and no member held", () => {
        it("sends nothing and returns the transaction id without a hash", async () => {
            wallet = await createMockWallet("stellar", api, "api-key");
            api.getTransaction.mockResolvedValue(
                awaiting("txn-1", [stellarEntry({ quorum: createQuorumApiEntry() })], "stellar") as never
            );

            const { value } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(value).toStrictEqual(AWAITING_TRANSACTION);
        });
    });
});

describe("addSigner() resuming a registration that quorum members must still approve", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns the signer with its transaction id, not as added (Stellar)", async () => {
        const wallet = await createSigningWallet("stellar", api);
        api.getSigner.mockResolvedValue({
            type: "external-wallet",
            address: "GNEW",
            locator: "external-wallet:GNEW",
            transaction: { id: "txn-add", status: "awaiting-approval" },
        } as never);
        const entry = createQuorumPendingApproval({
            quorum: createQuorumApiEntry(),
            createMessage: randomStellarMessage,
        });
        api.getTransaction.mockResolvedValue(awaiting("txn-add", [entry], "stellar") as never);

        const { value, error } = await settle(
            wallet.addSigner({ type: "external-wallet", address: "GNEW" } as SignerConfigForChain<Chain>)
        );

        expect(error).toBeUndefined();
        expect(api.registerSigner).not.toHaveBeenCalled();
        expect(value).toMatchObject({
            locator: "external-wallet:GNEW",
            transactionId: "txn-add",
            status: "awaiting-approval",
        });
    });

    it("returns the signer with its signature id, not as added (EVM)", async () => {
        const wallet = await createSigningWallet("base-sepolia", api);
        api.getSigner.mockResolvedValue({
            type: "external-wallet",
            address: "0x456",
            locator: "external-wallet:0x456",
            chains: { "base-sepolia": { id: "sig-add", status: "awaiting-approval" } },
        } as never);
        api.getSignature.mockResolvedValue(
            awaiting("sig-add", [createQuorumPendingApproval({ quorum: createQuorumApiEntry() })]) as never
        );

        const { value, error } = await settle(
            wallet.addSigner({ type: "external-wallet", address: "0x456" } as SignerConfigForChain<Chain>)
        );

        expect(error).toBeUndefined();
        expect(api.registerSigner).not.toHaveBeenCalled();
        expect(value).toMatchObject({
            locator: "external-wallet:0x456",
            signatureId: "sig-add",
            status: "awaiting-approval",
        });
    });
});

describe("approve() on a signature with a pending quorum entry", () => {
    let api: MockedApiClient;
    let wallet: Wallet<Chain>;
    const member = activeSignerMember("base-sepolia");
    const signatureSentApprovals = () => api.approveSignature.mock.calls.map((call) => call[2].approvals);

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        api = createMockApiClient();
        wallet = await createSigningWallet("base-sepolia", api);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("signs this client's member over its own message and returns the signature the approval completes", async () => {
        const entry = createQuorumPendingApproval({ quorum: quorumWith([member]) });
        api.getSignature.mockResolvedValue(awaiting("sig-1", [entry]) as never);
        api.approveSignature.mockResolvedValue({
            id: "sig-1",
            status: "success",
            outputSignature: "0xerc1271",
        } as never);

        const { value } = await settle(wallet.approve({ signatureId: "sig-1" }));

        expect(signatureSentApprovals()).toEqual([
            [{ signer: member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
        ]);
        expect(value).toEqual({ signature: "0xerc1271", signatureId: "sig-1" });
        expect(api.getSignature).toHaveBeenCalledTimes(1);
    });

    it("returns the signature id without a signature when other members must still sign", async () => {
        const quorum = quorumWith([member]);
        const [, ...others] = quorum.members;
        const afterApproval = awaiting("sig-1", [
            createQuorumPendingApproval({ quorum, pending: others, submitted: [member], remaining: 1 }),
        ]);
        api.getSignature.mockResolvedValueOnce(awaiting("sig-1", [createQuorumPendingApproval({ quorum })]) as never);
        api.getSignature.mockResolvedValue(afterApproval as never);
        api.approveSignature.mockResolvedValue(afterApproval as never);

        const { value, error } = await settle(wallet.approve({ signatureId: "sig-1" }));

        expect(error).toBeUndefined();
        expect(signatureSentApprovals()).toHaveLength(1);
        expect(value).toStrictEqual(AWAITING_SIGNATURE);
    });

    it("throws the API's rejection when the held member is pending in two different quorums", async () => {
        const first = createQuorumPendingApproval({ quorum: quorumWith([member]) });
        const second = createQuorumPendingApproval({ quorum: quorumWith([member]) });
        api.getSignature.mockResolvedValue(awaiting("sig-1", [first, second]) as never);
        const rejection = `Signer '${member.locator}' belongs to multiple quorums, which is not supported`;
        api.approveSignature.mockResolvedValue({ error: true, statusCode: 422, message: rejection } as never);

        const { error } = await settle(wallet.approve({ signatureId: "sig-1" }));

        expect(error).toBeInstanceOf(SignatureFailedError);
        expect((error as Error).message).toContain("belongs to multiple quorums");
    });

    it("sends no approval and returns the signature id without a signature when this client holds no pending member", async () => {
        const quorum = createQuorumApiEntry();
        api.getSignature.mockResolvedValue(awaiting("sig-1", [createQuorumPendingApproval({ quorum })]) as never);

        const { value } = await settle(wallet.approve({ signatureId: "sig-1" }));

        expect(api.approveSignature).not.toHaveBeenCalled();
        expect(value).toStrictEqual(AWAITING_SIGNATURE);
    });
});
