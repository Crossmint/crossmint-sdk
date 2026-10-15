import { expect } from "vitest";
import type {
    ApproveTransactionParams,
    CreateWalletParams,
    CreateWalletResponse,
    FundWalletParams,
    FundWalletResponse,
    GetBalanceResponse,
    GetTransactionResponse,
    WalletLocator,
    WalletsApiClient,
} from "@crossmint/wallets-sdk";
import { externalWalletSigner, pendingMessage, type TestSigner } from "../shared/signer";
import { DELAY_LONG, DELAY_RATE_LIMIT_WINDOW, TEST_VALUES } from "./constants";

export type { TestSigner } from "../shared/signer";

export interface ErrorResponse {
    error: true;
    message?: string;
    details?: unknown;
}

export interface SuccessWalletResponse {
    address: string;
    chainType: string;
    type: string;
    config?: {
        adminSigner?: {
            type: string;
            address: string;
        };
    };
}

export interface SuccessTransactionResponse {
    id: string;
    status: string;
    chainType: string;
}

export function isErrorResponse(response: unknown): response is ErrorResponse {
    return (
        typeof response === "object" &&
        response !== null &&
        "error" in response &&
        (response as ErrorResponse).error === true
    );
}

export function isSuccessWalletResponse(response: unknown): response is SuccessWalletResponse {
    return (
        typeof response === "object" &&
        response !== null &&
        "address" in response &&
        "chainType" in response &&
        "type" in response
    );
}

export function isSuccessTransactionResponse(response: unknown): response is SuccessTransactionResponse {
    return (
        typeof response === "object" &&
        response !== null &&
        "id" in response &&
        "status" in response &&
        "chainType" in response
    );
}

export function expectErrorResponse(response: unknown, message?: string): asserts response is ErrorResponse {
    expect(isErrorResponse(response)).toBe(true);
    if (message) {
        expect((response as ErrorResponse).message).toBeDefined();
    }
}

export function expectSuccessWalletResponse(response: unknown): asserts response is SuccessWalletResponse {
    expect(isSuccessWalletResponse(response)).toBe(true);
}

export function expectSuccessTransactionResponse(response: unknown): asserts response is SuccessTransactionResponse {
    expect(isSuccessTransactionResponse(response)).toBe(true);
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidSolanaAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

export class TestDataFactory {
    private wallets: string[] = [];
    private transactions: string[] = [];

    addWallet(address: string): void {
        if (address && !this.wallets.includes(address)) {
            this.wallets.push(address);
        }
    }

    addTransaction(id: string): void {
        if (id && !this.transactions.includes(id)) {
            this.transactions.push(id);
        }
    }

    clear(): void {
        this.wallets = [];
        this.transactions = [];
    }
}

export interface FreshWallet {
    address: string;
    signer: TestSigner;
}

export async function createFreshWallet(
    apiClient: WalletsApiClient,
    testData: TestDataFactory,
    options: {
        chainType?: "evm";
        type?: "mpc" | "smart";
        owner?: string;
        testName?: string;
        signer?: TestSigner;
    } = {}
): Promise<FreshWallet> {
    // "smart" is the default: MPC wallets are not enabled on the preview project.
    const { chainType = "evm", type = "smart", owner, testName = "default", signer = externalWalletSigner() } = options;
    const ownerId = owner || `userId:integration-${testName}-${Date.now()}`;

    const createResult = await apiClient.createWallet({
        chainType,
        type,
        owner: ownerId,
        ...(type === "smart" && { config: { adminSigner: signer.signer } }),
    } as Parameters<typeof apiClient.createWallet>[0]);

    if (isSuccessWalletResponse(createResult)) {
        testData.addWallet(createResult.address);
        return { address: createResult.address, signer };
    }

    throw new Error(`Failed to create test wallet: ${JSON.stringify(createResult)}`);
}

export async function createTestWallet(
    apiClient: WalletsApiClient,
    testData: TestDataFactory,
    params: CreateWalletParams
): Promise<CreateWalletResponse> {
    const result = await apiClient.createWallet(params);
    if (isSuccessWalletResponse(result)) {
        testData.addWallet(result.address);
    }
    return result;
}

// Funding is on-chain: the endpoint returns a txId, not a balance — poll waitForFundedBalance for that.
export const fundWallet = async (
    apiClient: WalletsApiClient,
    walletLocator: WalletLocator,
    amount: number,
    token: "usdxm" = "usdxm",
    chain = "base-sepolia"
): Promise<FundWalletResponse> => {
    const params: FundWalletParams = {
        amount,
        token,
        chain: chain as any,
    };

    const result = await apiClient.fundWallet(walletLocator, params);

    if (isErrorResponse(result)) {
        throw new Error(`Failed to fund wallet: ${JSON.stringify(result)}`);
    }

    await delay(DELAY_LONG);

    return result;
};

export async function waitForFundedBalance(
    apiClient: WalletsApiClient,
    walletLocator: WalletLocator,
    token: string,
    chain = "base-sepolia",
    maxRetries = 10
): Promise<GetBalanceResponse> {
    for (let i = 0; i < maxRetries; i++) {
        const result = await apiClient.getBalance(walletLocator, { chains: [chain as any], tokens: [token] });
        if (Array.isArray(result)) {
            const entry = (result as Array<{ symbol: string; amount: string }>).find(
                (balance) => balance.symbol === token
            );
            if (entry && entry.amount !== "0") {
                return result;
            }
        }
        await delay(DELAY_RATE_LIMIT_WINDOW);
    }

    return apiClient.getBalance(walletLocator, { chains: [chain as any], tokens: [token] });
}

// A send placed right after fundWallet races its on-chain confirmation; wait for the balance instead.
export async function fundWalletAndWait(
    apiClient: WalletsApiClient,
    walletLocator: WalletLocator,
    amount: number,
    token: "usdxm" = "usdxm",
    chain = "base-sepolia"
): Promise<void> {
    await fundWallet(apiClient, walletLocator, amount, token, chain);
    await waitForFundedBalance(apiClient, walletLocator, token, chain);
}

export async function approveTransaction(
    apiClient: WalletsApiClient,
    walletLocator: WalletLocator,
    transactionId: string,
    signer: TestSigner,
    maxRetries: number = TEST_VALUES.APPROVE_TRANSACTION_MAX_RETRIES
): Promise<GetTransactionResponse> {
    for (let i = 0; i < maxRetries; i++) {
        const transaction = await apiClient.getTransaction(walletLocator, transactionId);

        if (isErrorResponse(transaction)) {
            throw new Error(`Transaction not found: ${transaction.message || "Unknown error"}`);
        }

        if ("status" in transaction && (transaction.status === "success" || transaction.status === "failed")) {
            return transaction;
        }

        const pendingApprovals = "approvals" in transaction ? transaction.approvals?.pending : undefined;

        if (pendingApprovals && pendingApprovals.length > 0) {
            const approvals: ApproveTransactionParams = {
                approvals: [await signer.approval(pendingMessage(transaction))],
            };

            const approvedTransaction = await apiClient.approveTransaction(walletLocator, transactionId, approvals);

            if (isErrorResponse(approvedTransaction)) {
                throw new Error(`Failed to approve transaction: ${approvedTransaction.message || "Unknown error"}`);
            }

            await delay(DELAY_RATE_LIMIT_WINDOW);
            continue;
        }

        await delay(DELAY_LONG);
    }

    const finalTransaction = await apiClient.getTransaction(walletLocator, transactionId);
    if (isErrorResponse(finalTransaction)) {
        throw new Error(`Transaction not found after retries: ${finalTransaction.message || "Unknown error"}`);
    }

    if (!("status" in finalTransaction)) {
        throw new Error("Transaction response missing status property");
    }

    return finalTransaction;
}

export const sendTokenAndApprove = async (
    apiClient: WalletsApiClient,
    walletLocator: WalletLocator,
    tokenLocator: string,
    recipient: string,
    amount: string,
    signer: TestSigner
): Promise<GetTransactionResponse> => {
    const sendResult = await apiClient.send(walletLocator, tokenLocator, {
        recipient,
        amount,
    });

    if (isErrorResponse(sendResult)) {
        throw new Error(`Failed to send token: ${sendResult.message || "Unknown error"}`);
    }

    if (
        typeof sendResult === "object" &&
        sendResult !== null &&
        "id" in sendResult &&
        typeof (sendResult as { id: unknown }).id === "string"
    ) {
        return approveTransaction(apiClient, walletLocator, (sendResult as { id: string }).id, signer);
    }

    throw new Error("Transaction ID not found in send response");
};
