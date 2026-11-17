import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import {
    InvalidSignerError,
    QuorumApprovalRejectedError,
    QuorumRequestError,
    RecoverySignerLimitExceededError,
    SignatureFailedError,
    SignatureNotCreatedError,
    SignerOperationRejectedError,
    TransactionCancelledError,
    TransactionExpiredError,
    TransactionFailedError,
    TransactionNotCreatedError,
    WalletCreationError,
} from "../utils/errors";
import { EVMWallet } from "./evm";
import { SolanaWallet } from "./solana";
import { StellarWallet } from "./stellar";
import type { Wallet } from "./wallet";
import { WalletFactory } from "./wallet-factory";
import {
    createExpiredRequest,
    createMockApiClient,
    createMockSolanaSerializedTransaction,
    createMockWallet,
    createQuorumApiEntryWith,
    createQuorumPendingApproval,
    type MockedApiClient,
    EVM_TYPED_DATA,
} from "./__tests__/test-helpers";

const QUORUM_CODE = "QUORUM_SIZE_INVALID";
// Every quorum code the API answers with; the Solana ones (EDD 008 and 009) follow the E-milestone ones.
const QUORUM_CODES = [
    QUORUM_CODE,
    "QUORUM_APPROVING_MEMBERS_REQUIRED",
    "QUORUM_APPROVING_MEMBERS_COUNT_MISMATCH",
    "QUORUM_APPROVING_MEMBER_INVALID",
    "APPROVING_MEMBERS_NOT_APPLICABLE",
    "QUORUM_MEMBER_NOT_DESIGNATED",
    "QUORUM_TOO_MANY_ENVELOPE_SIGNERS",
    "SIGNER_KEY_IN_USE",
    "QUORUM_THRESHOLD_TOO_HIGH_FOR_CHAIN",
    "QUORUM_THRESHOLD_UNSUPPORTED",
];
const UNRELATED_CODE = "SOME_OTHER_ERROR";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const NEW_SIGNER = "0x4560000000000000000000000000000000000456";
const STELLAR_CONTRACT = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const APPROVAL = { signer: "external-wallet:0x123", signature: "0xsignature" };
const AWAITING_TRANSACTION = {
    id: "txn-1",
    status: "awaiting-approval",
    chainType: "evm",
    approvals: { pending: [], submitted: [] },
};
const AWAITING_SIGNATURE = { id: "sig-1", status: "awaiting-approval", approvals: { pending: [], submitted: [] } };

const errorBody = (code: string) => ({ error: true, message: `rejected: ${code}`, code });

// One API call site: `arrange` makes the call answer with `body`, `act` runs the SDK method that makes it.
type ErrorSite = {
    name: string;
    chain: Chain;
    signerType: "api-key" | "external-wallet";
    arrange: (api: MockedApiClient, body: object) => void;
    act: (wallet: Wallet<Chain>) => Promise<unknown>;
    todayError: (new (...args: never[]) => Error) | RegExp;
};

const ERROR_SITES: ErrorSite[] = [
    {
        name: "send",
        chain: "base-sepolia",
        signerType: "api-key",
        arrange: (api, body) => api.send.mockResolvedValue(body as never),
        act: (wallet) => wallet.send(RECIPIENT, "usdc", "1"),
        todayError: TransactionNotCreatedError,
    },
    {
        name: "EVM sendTransaction",
        chain: "base-sepolia",
        signerType: "api-key",
        arrange: (api, body) => api.createTransaction.mockResolvedValue(body as never),
        act: (wallet) => EVMWallet.from(wallet).sendTransaction({ to: RECIPIENT, value: 1n }),
        todayError: TransactionNotCreatedError,
    },
    {
        name: "EVM signMessage",
        chain: "base-sepolia",
        signerType: "api-key",
        arrange: (api, body) => api.createSignature.mockResolvedValue(body as never),
        act: (wallet) => EVMWallet.from(wallet).signMessage({ message: "hello" }),
        todayError: SignatureNotCreatedError,
    },
    {
        name: "EVM signTypedData",
        chain: "base-sepolia",
        signerType: "api-key",
        arrange: (api, body) => api.createSignature.mockResolvedValue(body as never),
        act: (wallet) => EVMWallet.from(wallet).signTypedData(EVM_TYPED_DATA as never),
        todayError: SignatureNotCreatedError,
    },
    {
        name: "Solana sendTransaction",
        chain: "solana",
        signerType: "api-key",
        arrange: (api, body) => api.createTransaction.mockResolvedValue(body as never),
        act: (wallet) =>
            SolanaWallet.from(wallet).sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
            }),
        todayError: TransactionNotCreatedError,
    },
    {
        name: "Stellar sendTransaction",
        chain: "stellar",
        signerType: "api-key",
        arrange: (api, body) => api.createTransaction.mockResolvedValue(body as never),
        act: (wallet) =>
            StellarWallet.from(wallet).sendTransaction({ contractId: STELLAR_CONTRACT, method: "transfer", args: {} }),
        todayError: TransactionNotCreatedError,
    },
    {
        name: "Stellar upgrade",
        chain: "stellar",
        signerType: "api-key",
        arrange: (api, body) => api.createTransaction.mockResolvedValue(body as never),
        act: (wallet) => StellarWallet.from(wallet).upgrade({ prepareOnly: true }),
        todayError: TransactionNotCreatedError,
    },
    {
        name: "Stellar migrate",
        chain: "stellar",
        signerType: "api-key",
        arrange: (api, body) => api.createTransaction.mockResolvedValue(body as never),
        act: (wallet) => StellarWallet.from(wallet).migrate({ prepareOnly: true }),
        todayError: TransactionNotCreatedError,
    },
    {
        name: "approve (transaction)",
        chain: "base-sepolia",
        signerType: "external-wallet",
        arrange: (api, body) => {
            api.getTransaction.mockResolvedValue(AWAITING_TRANSACTION as never);
            api.approveTransaction.mockResolvedValue(body as never);
        },
        act: (wallet) => wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } }),
        todayError: TransactionFailedError,
    },
    {
        name: "approve (signature)",
        chain: "base-sepolia",
        signerType: "external-wallet",
        arrange: (api, body) => {
            api.getSignature.mockResolvedValue(AWAITING_SIGNATURE as never);
            api.approveSignature.mockResolvedValue(body as never);
        },
        act: (wallet) => wallet.approve({ signatureId: "sig-1", options: { approval: APPROVAL } }),
        todayError: SignatureFailedError,
    },
    {
        name: "addSigner",
        chain: "base-sepolia",
        signerType: "api-key",
        arrange: (api, body) => api.registerSigner.mockResolvedValue(body as never),
        act: (wallet) => wallet.addSigner({ type: "external-wallet", address: NEW_SIGNER }),
        todayError: InvalidSignerError,
    },
    {
        name: "removeSigner",
        chain: "base-sepolia",
        signerType: "api-key",
        arrange: (api, body) => api.removeSigner.mockResolvedValue(body as never),
        act: (wallet) => wallet.removeSigner({ type: "external-wallet", address: NEW_SIGNER } as never),
        todayError: SignerOperationRejectedError,
    },
    {
        name: "addRecoveryMethod",
        chain: "solana",
        signerType: "api-key",
        arrange: (api, body) => api.registerRecoveryMethod.mockResolvedValue(body as never),
        act: (wallet) => wallet.addRecoveryMethod({ type: "external-wallet", address: "RecoveryAddress123" } as never),
        todayError: InvalidSignerError,
    },
    {
        name: "removeRecoveryMethod",
        chain: "solana",
        signerType: "api-key",
        arrange: (api, body) => api.removeRecoveryMethod.mockResolvedValue(body as never),
        act: (wallet) =>
            wallet.removeRecoveryMethod({ type: "external-wallet", address: "RecoveryAddress123" } as never),
        todayError: SignerOperationRejectedError,
    },
];

describe("quorum API errors at wallet call sites", () => {
    let api: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        api = createMockApiClient();
    });

    describe.each(ERROR_SITES)("$name", ({ chain, signerType, arrange, act, todayError }) => {
        let wallet: Wallet<Chain>;

        beforeEach(async () => {
            wallet = await createMockWallet(chain, api, signerType);
        });

        describe("when the API answers with a quorum error code", () => {
            it.each(QUORUM_CODES)("throws QuorumRequestError with %s as reason and the API message", async (code) => {
                arrange(api, errorBody(code));

                const error = await act(wallet).then(
                    () => expect.fail("Expected the call to throw"),
                    (thrown: unknown) => thrown
                );

                expect(error).toBeInstanceOf(QuorumRequestError);
                expect((error as QuorumRequestError).reason).toBe(code);
                expect((error as QuorumRequestError).message).toBe(`rejected: ${code}`);
            });
        });

        describe("when the API answers with an unrelated error code", () => {
            it("throws today's error", async () => {
                arrange(api, errorBody(UNRELATED_CODE));

                await expect(act(wallet)).rejects.toThrow(todayError);
            });
        });
    });

    describe.each([
        {
            name: "removeSigner",
            arrange: (api: MockedApiClient, body: object) => api.removeSigner.mockResolvedValue(body as never),
            act: (wallet: Wallet<Chain>) =>
                wallet.removeSigner({ type: "external-wallet", address: NEW_SIGNER } as never),
        },
        {
            name: "removeRecoveryMethod",
            arrange: (api: MockedApiClient, body: object) => api.removeRecoveryMethod.mockResolvedValue(body as never),
            act: (wallet: Wallet<Chain>) =>
                wallet.removeRecoveryMethod({ type: "external-wallet", address: "RecoveryAddress123" } as never),
        },
    ])("$name", ({ arrange, act }) => {
        it("throws a typed error with the API message for an uncoded rejection", async () => {
            const wallet = await createMockWallet("solana", api, "api-key");
            arrange(api, { error: true, statusCode: 400, message: "Rejected for some reason" });

            const error = await act(wallet).then(
                () => expect.fail("Expected the call to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(SignerOperationRejectedError);
            expect((error as Error).message).toBe("Rejected for some reason");
            expect((error as SignerOperationRejectedError).apiErrorCode).toBeUndefined();
        });

        it("throws QuorumRequestError with LAST_RECOVERY_SIGNER as reason", async () => {
            const wallet = await createMockWallet("solana", api, "api-key");
            arrange(api, {
                error: true,
                statusCode: 400,
                code: "LAST_RECOVERY_SIGNER",
                message: "The wallet's only recovery method cannot be removed",
            });

            const error = await act(wallet).then(
                () => expect.fail("Expected the call to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(QuorumRequestError);
            expect((error as QuorumRequestError).reason).toBe("LAST_RECOVERY_SIGNER");
            expect((error as QuorumRequestError).message).toBe("The wallet's only recovery method cannot be removed");
        });
    });

    describe("approve, when the request expired", () => {
        const EXPIRED = { error: true, code: "TRANSACTION_EXPIRED", message: "The transaction expired." };

        it("throws TransactionExpiredError with the transaction id for a transaction", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getTransaction.mockResolvedValue(AWAITING_TRANSACTION as never);
            api.approveTransaction.mockResolvedValue(EXPIRED as never);

            const error = await wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect(error).toBeInstanceOf(TransactionFailedError);
            expect((error as TransactionExpiredError).transactionId).toBe("txn-1");
            expect((error as TransactionExpiredError).signatureId).toBeUndefined();
        });

        it("throws TransactionExpiredError with the signature id for a signature", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getSignature.mockResolvedValue(AWAITING_SIGNATURE as never);
            api.approveSignature.mockResolvedValue(EXPIRED as never);

            const error = await wallet.approve({ signatureId: "sig-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect((error as TransactionExpiredError).signatureId).toBe("sig-1");
            expect((error as TransactionExpiredError).transactionId).toBeUndefined();
        });
    });

    describe("approve, when the API answers the approval with TRANSACTION_CANCELLED", () => {
        it("throws TransactionCancelledError with the transaction id", async () => {
            const wallet = await createMockWallet("solana", api, "external-wallet");
            api.getTransaction.mockResolvedValue({ ...AWAITING_TRANSACTION, chainType: "solana" } as never);
            api.approveTransaction.mockResolvedValue({
                error: true,
                code: "TRANSACTION_CANCELLED",
                message: "The transaction was cancelled.",
            } as never);

            const error = await wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionCancelledError);
            expect((error as TransactionCancelledError).transactionId).toBe("txn-1");
        });
    });

    describe("approve, when the transaction was cancelled before the approval", () => {
        it("throws TransactionCancelledError with the transaction id and sends no approval", async () => {
            const wallet = await createMockWallet("solana", api, "external-wallet");
            api.getTransaction.mockResolvedValue({
                id: "txn-1",
                status: "cancelled",
                chainType: "solana",
                approvals: { pending: [], submitted: [] },
            } as never);

            const error = await wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionCancelledError);
            expect((error as TransactionCancelledError).transactionId).toBe("txn-1");
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });
    });

    describe("approve, when the request expired before the approval", () => {
        it("throws TransactionExpiredError with the transaction id and sends no approval", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getTransaction.mockResolvedValue(createExpiredRequest("txn-1") as never);

            const error = await wallet.approve({ transactionId: "txn-1" }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect((error as TransactionExpiredError).transactionId).toBe("txn-1");
            expect(api.approveTransaction).not.toHaveBeenCalled();
        });

        it("throws TransactionExpiredError with the signature id and sends no approval", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getSignature.mockResolvedValue(createExpiredRequest("sig-1") as never);

            const error = await wallet.approve({ signatureId: "sig-1" }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect((error as TransactionExpiredError).signatureId).toBe("sig-1");
            expect(api.approveSignature).not.toHaveBeenCalled();
        });
    });

    describe("approve, when the signature expires while the approval is submitted", () => {
        it("throws TransactionExpiredError with the signature id", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getSignature.mockResolvedValue(AWAITING_SIGNATURE as never);
            // ApiClient answers the API's 422 expiry by reading the signature request again.
            api.approveSignature.mockResolvedValue(createExpiredRequest("sig-1") as never);

            const error = await wallet.approve({ signatureId: "sig-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(TransactionExpiredError);
            expect((error as TransactionExpiredError).signatureId).toBe("sig-1");
        });
    });

    describe("approve, when the API rejects one member's approval signature", () => {
        const MEMBER = "external-wallet:0x123";
        const REJECTED = {
            error: true,
            statusCode: 400,
            message: `Invalid signature for signer ${MEMBER}`,
        };
        const quorumEntry = () =>
            createQuorumPendingApproval({
                quorum: createQuorumApiEntryWith([{ type: "external-wallet", address: "0x123", locator: MEMBER }]),
            });
        const QUORUM_TRANSACTION = { ...AWAITING_TRANSACTION, approvals: { pending: [quorumEntry()], submitted: [] } };
        const QUORUM_SIGNATURE = { ...AWAITING_SIGNATURE, approvals: { pending: [quorumEntry()], submitted: [] } };

        it("throws QuorumApprovalRejectedError, not TransactionFailedError, for a transaction", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getTransaction.mockResolvedValue(QUORUM_TRANSACTION as never);
            api.approveTransaction.mockResolvedValue(REJECTED as never);

            const error = await wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(QuorumApprovalRejectedError);
            expect(error).not.toBeInstanceOf(TransactionFailedError);
            expect(error).toMatchObject({ signerLocator: MEMBER, transactionId: "txn-1" });
            expect((error as Error).message).toBe(REJECTED.message);
        });

        it("throws QuorumApprovalRejectedError, not SignatureFailedError, for a signature", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getSignature.mockResolvedValue(QUORUM_SIGNATURE as never);
            api.approveSignature.mockResolvedValue(REJECTED as never);

            const error = await wallet.approve({ signatureId: "sig-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(QuorumApprovalRejectedError);
            expect(error).not.toBeInstanceOf(SignatureFailedError);
            expect(error).toMatchObject({ signerLocator: MEMBER, signatureId: "sig-1" });
        });

        it("throws QuorumApprovalRejectedError for a malformed member signature too", async () => {
            const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
            api.getTransaction.mockResolvedValue(QUORUM_TRANSACTION as never);
            api.approveTransaction.mockResolvedValue({
                error: true,
                statusCode: 400,
                message: `Signature '0xdeadbeef...' on the approval for signer '${MEMBER}' is invalid. Please ensure you're providing a valid hex-encoded ECDSA signature and the signer is correct.`,
            } as never);

            const error = await wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } }).then(
                () => expect.fail("Expected approve to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(QuorumApprovalRejectedError);
            expect(error).toMatchObject({ signerLocator: MEMBER, transactionId: "txn-1" });
        });

        describe("when the rejected signer is not a member of a pending quorum", () => {
            it("still throws TransactionFailedError for a transaction", async () => {
                const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
                api.getTransaction.mockResolvedValue(AWAITING_TRANSACTION as never);
                api.approveTransaction.mockResolvedValue(REJECTED as never);

                await expect(
                    wallet.approve({ transactionId: "txn-1", options: { approval: APPROVAL } })
                ).rejects.toBeInstanceOf(TransactionFailedError);
            });

            it("still throws SignatureFailedError for a signature", async () => {
                const wallet = await createMockWallet("base-sepolia", api, "external-wallet");
                api.getSignature.mockResolvedValue(AWAITING_SIGNATURE as never);
                api.approveSignature.mockResolvedValue(REJECTED as never);

                await expect(
                    wallet.approve({ signatureId: "sig-1", options: { approval: APPROVAL } })
                ).rejects.toBeInstanceOf(SignatureFailedError);
            });
        });
    });

    describe("Stellar upgrade, when the wallet is already locked", () => {
        it("skips the upgrade phase and prepares the migration, as before", async () => {
            const stellarWallet = StellarWallet.from(await createMockWallet("stellar", api, "api-key"));
            api.createTransaction
                .mockResolvedValueOnce({ error: true, statusCode: 409, message: "Wallet is locked" } as never)
                .mockResolvedValueOnce({ id: "txn-migrate" } as never);

            const result = await stellarWallet.upgrade({ prepareOnly: true });

            expect(result.transactionId).toBe("txn-migrate");
        });
    });
});

describe("quorum API errors at wallet creation", () => {
    const createWallet = vi.fn();
    const factory = new WalletFactory({
        isServerSide: false,
        crossmint: { projectId: "test-project" },
        projectId: "test-project",
        environment: APIKeyEnvironmentPrefix.STAGING,
        getWallet: vi.fn(),
        createWallet,
    } as unknown as ApiClient);
    const createSolanaWallet = () =>
        factory.createWallet({ chain: "solana", recovery: { type: "external-wallet", address: "AdminAddress123" } });

    beforeEach(() => {
        createWallet.mockReset();
    });

    describe("when the API answers with a quorum error code", () => {
        it.each(QUORUM_CODES)("throws QuorumRequestError with %s as reason", async (code) => {
            createWallet.mockResolvedValue(errorBody(code));

            await expect(createSolanaWallet()).rejects.toMatchObject({ reason: code });
            await expect(createSolanaWallet()).rejects.toBeInstanceOf(QuorumRequestError);
        });
    });

    describe("when the API answers with a recovery-signer error code", () => {
        it("keeps the recovery-signer error", async () => {
            createWallet.mockResolvedValue(errorBody("SIGNER_LIMIT_EXCEEDED"));

            await expect(createSolanaWallet()).rejects.toBeInstanceOf(RecoverySignerLimitExceededError);
        });
    });

    describe("when the API answers with an unrelated error code", () => {
        it("throws WalletCreationError with the API message and the code as apiErrorCode", async () => {
            createWallet.mockResolvedValue(errorBody(UNRELATED_CODE));

            const error = await createSolanaWallet().then(
                () => expect.fail("Expected createWallet to throw"),
                (thrown: unknown) => thrown
            );

            expect(error).toBeInstanceOf(WalletCreationError);
            expect((error as WalletCreationError).apiErrorCode).toBe(UNRELATED_CODE);
            expect((error as Error).message).toBe(`rejected: ${UNRELATED_CODE}`);
        });
    });

    describe("when the EVM API rejects a quorum-only recovery config without a code", () => {
        it("throws WalletCreationError with the API message, not the raw body", async () => {
            createWallet.mockResolvedValue({
                error: true,
                statusCode: 400,
                message: "A wallet created with a recovery quorum also needs a single recovery signer.",
            });

            const error = await factory
                .createWallet({
                    chain: "base-sepolia",
                    recoveryMethods: [
                        {
                            type: "quorum",
                            threshold: 1,
                            members: [
                                { type: "external-wallet", address: "0x4560000000000000000000000000000000000456" },
                            ],
                        },
                    ],
                })
                .then(
                    () => expect.fail("Expected createWallet to throw"),
                    (thrown: unknown) => thrown
                );

            expect(error).toBeInstanceOf(WalletCreationError);
            expect((error as Error).message).toBe(
                "A wallet created with a recovery quorum also needs a single recovery signer."
            );
        });
    });
});
