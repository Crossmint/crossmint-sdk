import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../chains/chains";
import type { QuorumMember, RecoverySignerConfigForChain, SignerConfigForChain } from "../signers/types";
import {
    InvalidSignerError,
    SignatureAwaitingApprovalError,
    SignatureNotAvailableError,
    TransactionAwaitingApprovalError,
    TransactionExpiredError,
    TransactionFailedError,
} from "../utils/errors";
import type { Wallet } from "./wallet";
import {
    activeSignerMember,
    createHeldSigner,
    createMockApiClient,
    createMockWallet,
    createQuorumApiEntry,
    createQuorumPendingApproval,
    createSigningWallet,
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

// Runs the call to the end, timers included; the outcome is the value or the error.
async function settle<T>(call: Promise<T>): Promise<{ value?: T; error?: unknown }> {
    const outcome = call.then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
    );
    await vi.runAllTimersAsync();
    return outcome;
}

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

        it("throws TransactionAwaitingApprovalError with the quorum's progress when other members must still sign", async () => {
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

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(error).toBeInstanceOf(TransactionAwaitingApprovalError);
            expect(error).toMatchObject({
                transactionId: "txn-1",
                quorums: [
                    {
                        quorum: quorum.locator,
                        threshold: 2,
                        remaining: 1,
                        pending: others.map(({ locator }) => locator),
                        submitted: [member.locator],
                    },
                ],
            });
        });
    });

    describe("when this client holds no pending member", () => {
        it("sends no approval and throws the awaiting error with the quorum's progress", async () => {
            const quorum = createQuorumApiEntry();
            const pending = [createQuorumPendingApproval({ quorum })];
            api.getTransaction.mockResolvedValue(awaiting("txn-1", pending) as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(error).toBeInstanceOf(TransactionAwaitingApprovalError);
            expect((error as TransactionAwaitingApprovalError).quorums?.[0]?.quorum).toBe(quorum.locator);
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

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(error).toBeInstanceOf(TransactionAwaitingApprovalError);
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

    describe("when a held member is pending in two quorum entries", () => {
        it("throws the API's rejection, which the API returns for any member shared by two quorum entries", async () => {
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
        it("throws InvalidSignerError, as before: that key signs quorum members only", async () => {
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

        it("signs only the quorum members when a flat entry is pending too, leaving the flat entry to the API", async () => {
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

        it("signs the held members of a pending signature", async () => {
            const held = createQuorumApiEntry().members[0];
            const entry = createQuorumPendingApproval({ quorum: quorumWith([held]) });
            api.getSignature.mockResolvedValue(awaiting("sig-1", [entry]) as never);
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

        it("sends nothing and throws the awaiting error when no member is held", async () => {
            const quorum = createQuorumApiEntry();
            api.getTransaction.mockResolvedValue(awaiting("txn-1", [createQuorumPendingApproval({ quorum })]) as never);

            const { error } = await settle(wallet.approve({ transactionId: "txn-1" }));

            expect(api.approveTransaction).not.toHaveBeenCalled();
            expect(error).toBeInstanceOf(TransactionAwaitingApprovalError);
            expect((error as TransactionAwaitingApprovalError).quorums?.[0]?.quorum).toBe(quorum.locator);
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

describe("send() with a quorum as signer", () => {
    it("creates the transaction as the quorum and signs this client's pending member", async () => {
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

        const { value } = await settle(
            wallet.send(RECIPIENT, "usdc", "1", { signer: quorum.locator, prepareOnly: false })
        );

        expect(api.send.mock.calls[0][2]).toMatchObject({ signer: quorum.locator });
        expect(sentApprovals(api)).toEqual([
            [{ signer: member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
        ]);
        expect(value).toMatchObject({ transactionId: "txn-1", hash: "0xhash" });
        vi.useRealTimers();
    });
});

describe("approve() on a Stellar transaction with a pending quorum entry", () => {
    it("signs this client's member over its own message", async () => {
        vi.useFakeTimers();
        const api = createMockApiClient();
        const wallet = await createSigningWallet("stellar", api);
        const member = activeSignerMember("stellar");
        const entry = createQuorumPendingApproval({ quorum: quorumWith([member]) });
        api.approveTransaction.mockResolvedValue({ id: "txn-1", status: "pending" } as never);
        api.getTransaction.mockResolvedValueOnce(awaiting("txn-1", [entry], "stellar") as never);
        api.getTransaction.mockResolvedValue({ ...SUCCESS, onChain: { txHash: "stellar-hash" } } as never);

        await settle(wallet.approve({ transactionId: "txn-1" }));

        expect(sentApprovals(api)).toEqual([
            [{ signer: member.locator, signature: signatureOver(entry.quorumApprovals.pending[0].message) }],
        ]);
        vi.useRealTimers();
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

    it("throws SignatureAwaitingApprovalError with the quorum's progress when other members must still sign", async () => {
        const quorum = quorumWith([member]);
        const [, ...others] = quorum.members;
        const afterApproval = awaiting("sig-1", [
            createQuorumPendingApproval({ quorum, pending: others, submitted: [member], remaining: 1 }),
        ]);
        api.getSignature.mockResolvedValueOnce(awaiting("sig-1", [createQuorumPendingApproval({ quorum })]) as never);
        api.getSignature.mockResolvedValue(afterApproval as never);
        api.approveSignature.mockResolvedValue(afterApproval as never);

        const { error } = await settle(wallet.approve({ signatureId: "sig-1" }));

        expect(error).toBeInstanceOf(SignatureAwaitingApprovalError);
        expect(error).toBeInstanceOf(SignatureNotAvailableError);
        expect(error).toMatchObject({
            signatureId: "sig-1",
            quorums: [{ quorum: quorum.locator, remaining: 1, submitted: [member.locator] }],
        });
    });

    it("sends no approval when this client holds no pending member", async () => {
        const quorum = createQuorumApiEntry();
        api.getSignature.mockResolvedValue(awaiting("sig-1", [createQuorumPendingApproval({ quorum })]) as never);

        const { error } = await settle(wallet.approve({ signatureId: "sig-1" }));

        expect(api.approveSignature).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(SignatureAwaitingApprovalError);
    });
});
