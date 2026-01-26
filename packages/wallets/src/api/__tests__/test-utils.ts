import { expect, vi, type MockedFunction } from "vitest";
import type { Crossmint } from "@crossmint/common-sdk-base";
import { ApiClient } from "../client";
import type {
    CreateWalletResponse,
    CreateWalletParams,
    SendResponse,
    FundWalletParams,
    FundWalletResponse,
    GetTransactionResponse,
    ApproveTransactionParams,
    WalletLocator,
} from "../types";
import {
    HTTP_ERROR_STATUSES,
    DELAY_LONG,
    DELAY_RATE_LIMIT_WINDOW,
    MOCK_API_KEY,
    TEST_VALUES,
    WALLET_LOCATORS,
    TEST_ADDRESSES,
} from "./constants";

export type MockResponseOptions<T> = {
    data: T;
    status?: number;
    ok?: boolean;
    statusText?: string;
};

export type FetchCallInfo = { path: string; options: RequestInit };

export const createMockResponse = <T>({
    data,
    status = 200,
    ok = true,
    statusText = "OK",
}: MockResponseOptions<T>): Response => {
    return {
        json: vi.fn().mockResolvedValue(data),
        ok,
        status,
        statusText,
    } as unknown as Response;
};

export const createMockSuccessResponse = <T>(data: T): Response => createMockResponse({ data });

export const createMockErrorResponse = <T>(data: T, status = 400, statusText = "Bad Request"): Response =>
    createMockResponse({ data, status, ok: false, statusText });

export const createMockCrossmint = (overrides: Partial<Crossmint> = {}): Crossmint => {
    const base = {
        apiKey: MOCK_API_KEY,
        ...overrides,
    };
    return {
        ...base,
        setJwt: vi.fn().mockReturnThis(),
        experimental_setCustomAuth: vi.fn().mockReturnThis(),
    } as Crossmint;
};

export const createTestApiClient = (crossmint?: Crossmint): ApiClient => {
    return new ApiClient(crossmint || createMockCrossmint());
};

export const createServerSideApiClient = (): ApiClient => {
    const apiClient = createTestApiClient();
    Object.defineProperty(apiClient, "isServerSide", {
        get: () => true,
        configurable: true,
    });
    return apiClient;
};

export const extractFetchCall = (
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>
): FetchCallInfo | undefined => {
    const calls = (mockFn as MockedFunction<any>).mock.calls;
    if (calls.length === 0) {
        return undefined;
    }
    const lastCall = calls[calls.length - 1];
    return {
        path: lastCall[0] as string,
        options: lastCall[1] as RequestInit,
    };
};

export const expectRequestPath = (call: FetchCallInfo | undefined, expectedPath: string) => {
    expect(call?.path).toBe(expectedPath);
};

export const expectCommonHeaders = (headers: HeadersInit) => {
    const headerObj = headers as Record<string, string>;
    expect(headerObj["Content-Type"]).toBe("application/json");
};

export const expectRequestBody = (options: RequestInit, expectedBody: unknown) => {
    expect(options.body).toBe(JSON.stringify(expectedBody));
};

export const validateRequest = (call: FetchCallInfo | undefined, expectedPath: string, expectedBody?: unknown) => {
    expect(call).toBeDefined();
    if (!call) {
        return;
    }
    expectRequestPath(call, expectedPath);
    if (call.options.headers) {
        expectCommonHeaders(call.options.headers);
    }
    if (expectedBody !== undefined && call.options) {
        expectRequestBody(call.options, expectedBody);
    }
};

export const testHttpErrorResponse = async <T>(
    apiCall: () => Promise<T>,
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>,
    errorData: { error: boolean; message?: string },
    statusCode: number
) => {
    (mockFn as MockedFunction<any>).mockResolvedValue(createMockErrorResponse(errorData, statusCode));
    const result = await apiCall();
    expect(isErrorResponse(result)).toBe(true);
    if (isErrorResponse(result)) {
        expect(result.error).toBe(true);
        if (errorData.message) {
            expect(result.message).toBe(errorData.message);
        }
    }
};

export const testCommonHttpErrors = async <T>(
    apiCall: () => Promise<T>,
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>,
    skipStatuses: number[] = []
) => {
    for (const { status, message } of HTTP_ERROR_STATUSES) {
        if (skipStatuses.includes(status)) {
            continue;
        }
        const errorResponse = { error: true, message };
        (mockFn as MockedFunction<any>).mockResolvedValueOnce(createMockErrorResponse(errorResponse, status));
        const result = await apiCall();
        expect(isErrorResponse(result)).toBe(true);
    }
};

export const testNetworkError = async <T>(
    apiCall: () => Promise<T>,
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>
) => {
    (mockFn as MockedFunction<any>).mockRejectedValue(new Error("Network error"));
    await expect(apiCall()).rejects.toThrow("Network error");
};

export const testInvalidJsonResponse = async <T>(
    apiCall: () => Promise<T>,
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>
) => {
    const mockResponse = {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        ok: true,
        status: 200,
    } as unknown as Response;
    (mockFn as MockedFunction<any>).mockResolvedValue(mockResponse);
    await expect(apiCall()).rejects.toThrow();
};

export const testTimeoutError = async <T>(
    apiCall: () => Promise<T>,
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>
) => {
    (mockFn as MockedFunction<any>).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 0))
    );
    await expect(apiCall()).rejects.toThrow("Request timeout");
};

export const testMalformedResponse = async <T>(
    apiCall: () => Promise<T>,
    mockFn: MockedFunction<any> | MockedFunction<ApiClient["post"]> | MockedFunction<ApiClient["get"]>,
    malformedData: unknown
) => {
    (mockFn as MockedFunction<any>).mockResolvedValue(createMockSuccessResponse(malformedData));
    const result = await apiCall();
    expect(result).toEqual(malformedData);
};

export const createMockWalletResponse = (overrides: Partial<CreateWalletResponse> = {}): CreateWalletResponse =>
    ({
        address: WALLET_LOCATORS.evmAddress,
        chainType: "evm",
        type: "smart",
        config: {
            adminSigner: {
                type: "external-wallet",
                address: TEST_ADDRESSES.EVM_TEST,
            },
        },
        ...overrides,
    }) as CreateWalletResponse;

export const createMockSendResponse = (overrides: Partial<SendResponse> = {}): SendResponse =>
    ({
        id: "txn-123",
        status: "pending",
        chainType: "evm",
        walletType: "evm-smart-wallet",
        params: {
            transaction: "0x1234567890abcdef",
            signer: "api-key:test",
        },
        onChain: {
            txId: "0xabcdef1234567890abcdef1234567890abcdef12",
            explorerLink: "https://explorer.example.com/tx/0xabcdef1234567890abcdef1234567890abcdef12",
        },
        createdAt: Date.now(),
        ...overrides,
    }) as unknown as SendResponse;

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

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const isValidSolanaAddress = (address: string): boolean => {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/**
 * Creates an API client for integration tests using environment variables.
 * This is different from createTestApiClient which uses mocked data.
 */
export const createIntegrationApiClient = (
    apiKey: string,
    baseUrl?: string,
    overrides: Partial<Crossmint> = {}
): ApiClient => {
    const base = {
        apiKey,
        ...(baseUrl && { overrideBaseUrl: baseUrl }),
        ...overrides,
    };
    const crossmint = {
        ...base,
        setJwt: () => crossmint as Crossmint,
        experimental_setCustomAuth: () => crossmint as Crossmint,
    } as Crossmint;
    return new ApiClient(crossmint);
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

    getWallet(index = 0): string | undefined {
        return this.wallets[index];
    }

    getTransaction(index = 0): string | undefined {
        return this.transactions[index];
    }

    hasWallets(): boolean {
        return this.wallets.length > 0;
    }

    clear(): void {
        this.wallets = [];
        this.transactions = [];
    }
}

export async function ensureWalletExists(
    apiClient: ApiClient,
    testData: TestDataFactory,
    options: {
        chainType?: "evm" | "solana";
        type?: "mpc" | "smart";
        owner?: string;
        testName?: string;
    } = {}
): Promise<string | undefined> {
    if (testData.hasWallets()) {
        return testData.getWallet();
    }

    const { chainType = "evm", type = "mpc", owner, testName = "default" } = options;
    const ownerId = owner || `userId:integration-${testName}-${Date.now()}`;

    const createResult = await apiClient.createWallet({
        chainType,
        type,
        ...(owner && { owner: ownerId }),
    });

    if (isSuccessWalletResponse(createResult)) {
        testData.addWallet(createResult.address);
        return createResult.address;
    }

    return undefined;
}

export async function createTestWallet(
    apiClient: ApiClient,
    testData: TestDataFactory,
    params: CreateWalletParams
): Promise<CreateWalletResponse> {
    const result = await apiClient.createWallet(params);
    if (isSuccessWalletResponse(result)) {
        testData.addWallet(result.address);
    }
    return result;
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

export const fundWallet = async (
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    amount: number,
    token: "usdc" | "usdxm" = "usdxm",
    chain = "base-sepolia"
): Promise<FundWalletResponse> => {
    const params: FundWalletParams = {
        amount,
        token,
        chain: chain as any,
    };

    const result = await apiClient.fundWallet(walletLocator, params);

    if (isErrorResponse(result)) {
        throw new Error(`Failed to fund wallet: ${result.message || "Unknown error"}`);
    }

    await delay(DELAY_LONG);

    return result;
};

export const approveTransaction = async (
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    transactionId: string,
    maxRetries: number = TEST_VALUES.APPROVE_TRANSACTION_MAX_RETRIES
): Promise<GetTransactionResponse> => {
    for (let i = 0; i < maxRetries; i++) {
        const transaction = await apiClient.getTransaction(walletLocator, transactionId);

        if (isErrorResponse(transaction)) {
            throw new Error(`Transaction not found: ${transaction.message || "Unknown error"}`);
        }

        // Type guard: check if transaction has status property (success response)
        if ("status" in transaction && (transaction.status === "success" || transaction.status === "failed")) {
            return transaction;
        }

        const pendingApprovals = "approvals" in transaction ? transaction.approvals?.pending : undefined;

        if (pendingApprovals && pendingApprovals.length > 0) {
            const approvals: ApproveTransactionParams = {
                approvals: pendingApprovals.map((approval) => ({
                    signer: approval.signer.locator,
                    signature: "",
                })),
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

    // Type guard: ensure transaction has status property before returning
    if (!("status" in finalTransaction)) {
        throw new Error("Transaction response missing status property");
    }

    return finalTransaction;
};

export const fundWalletAndWait = async (
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    amount = 1.0,
    token: "usdc" | "usdxm" = "usdxm",
    chain = "base-sepolia"
): Promise<FundWalletResponse> => {
    return fundWallet(apiClient, walletLocator, amount, token, chain);
};

export const sendTokenAndApprove = async (
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    tokenLocator: string,
    recipient: string,
    amount: string
): Promise<GetTransactionResponse> => {
    const sendResult = await apiClient.send(walletLocator, tokenLocator, {
        recipient,
        amount,
    });

    if (isErrorResponse(sendResult)) {
        throw new Error(`Failed to send token: ${sendResult.message || "Unknown error"}`);
    }

    // SendResponse can have an id field when successful
    if (
        typeof sendResult === "object" &&
        sendResult !== null &&
        "id" in sendResult &&
        typeof (sendResult as { id: unknown }).id === "string"
    ) {
        return approveTransaction(apiClient, walletLocator, (sendResult as { id: string }).id);
    }

    throw new Error("Transaction ID not found in send response");
};

export const ensureWalletFunded = async (
    apiClient: ApiClient,
    walletLocator: WalletLocator,
    amount = 1.0,
    token: "usdc" | "usdxm" = "usdxm",
    chain = "base-sepolia"
): Promise<void> => {
    try {
        await fundWallet(apiClient, walletLocator, amount, token, chain);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("already funded") && !errorMessage.includes("insufficient")) {
            throw error;
        }
    }
};
