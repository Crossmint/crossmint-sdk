import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import type { ApiClient } from "../api";
import type { Chain } from "../chains/chains";
import {
    InvalidSignerError,
    QuorumRequestError,
    RecoverySignerLimitExceededError,
    SignatureFailedError,
    SignatureNotCreatedError,
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
    type MockedApiClient,
} from "./__tests__/test-helpers";

const QUORUM_CODE = "QUORUM_SIZE_INVALID";
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
const TYPED_DATA = {
    domain: { name: "App", version: "1", chainId: 84532, verifyingContract: RECIPIENT },
    types: { Mail: [{ name: "contents", type: "string" }] },
    primaryType: "Mail",
    message: { contents: "hello" },
    chain: "base-sepolia",
} as const;

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
        act: (wallet) => EVMWallet.from(wallet).signTypedData(TYPED_DATA as never),
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
        todayError: /Failed to remove signer/,
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
        todayError: /Failed to remove recovery method/,
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
            it("throws QuorumRequestError with the code as reason and the API message", async () => {
                arrange(api, errorBody(QUORUM_CODE));

                const error = await act(wallet).then(
                    () => expect.fail("Expected the call to throw"),
                    (thrown: unknown) => thrown
                );

                expect(error).toBeInstanceOf(QuorumRequestError);
                expect((error as QuorumRequestError).reason).toBe(QUORUM_CODE);
                expect((error as QuorumRequestError).message).toBe(`rejected: ${QUORUM_CODE}`);
            });
        });

        describe("when the API answers with an unrelated error code", () => {
            it("throws today's error", async () => {
                arrange(api, errorBody(UNRELATED_CODE));

                await expect(act(wallet)).rejects.toThrow(todayError);
            });
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
        it("throws QuorumRequestError with the code as reason", async () => {
            createWallet.mockResolvedValue(errorBody(QUORUM_CODE));

            await expect(createSolanaWallet()).rejects.toMatchObject({ reason: QUORUM_CODE });
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
        it("throws WalletCreationError", async () => {
            createWallet.mockResolvedValue(errorBody(UNRELATED_CODE));

            await expect(createSolanaWallet()).rejects.toBeInstanceOf(WalletCreationError);
        });
    });
});
