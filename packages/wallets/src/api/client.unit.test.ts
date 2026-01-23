import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import type { ApiClient } from "./client";
import type { CreateWalletParams, SendParams } from "./types";
import { WALLET_LOCATORS, TOKEN_LOCATORS } from "./__tests__/constants";
import {
    createMockWalletResponse,
    createMockSendResponse,
    createMockSuccessResponse,
    createMockErrorResponse,
    createTestApiClient,
    createServerSideApiClient,
    extractFetchCall,
    expectRequestPath,
    expectCommonHeaders,
    expectRequestBody,
    validateRequest,
    testHttpErrorResponse,
    testCommonHttpErrors,
    testNetworkError,
    testInvalidJsonResponse,
    testTimeoutError,
} from "./__tests__/test-utils";

vi.mock("../logger/init", () => ({
    walletsLogger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

describe("ApiClient - createWallet()", () => {
    let apiClient: ApiClient;
    let mockPost: MockedFunction<ApiClient["post"]>;

    beforeEach(() => {
        apiClient = createTestApiClient();
        mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("success cases", () => {
        it("should create EVM smart wallet successfully (client-side)", async () => {
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    },
                },
            };

            const result = await apiClient.createWallet(params);

            expect(result).toEqual(mockResponse);
            expect(mockPost).toHaveBeenCalledTimes(1);
            validateRequest(extractFetchCall(mockPost), "api/2025-06-09/wallets/me", params);
        });

        it("should create wallet successfully (server-side)", async () => {
            const serverClient = createServerSideApiClient();
            const serverMockPost = vi.spyOn(serverClient, "post") as MockedFunction<ApiClient["post"]>;

            const mockResponse = createMockWalletResponse();
            serverMockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    },
                },
            };

            const result = await serverClient.createWallet(params);

            expect(result).toEqual(mockResponse);
            validateRequest(extractFetchCall(serverMockPost), "api/2025-06-09/wallets", params);
        });

        it("should create Solana wallet successfully", async () => {
            const mockResponse = createMockWalletResponse({
                address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                chainType: "solana",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "ABC123456789012345678901234567890123456789012345",
                        locator: "external-wallet:ABC123456789012345678901234567890123456789012345",
                    },
                },
            } as any);

            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "solana",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "ABC123456789012345678901234567890123456789012345",
                    },
                },
            };

            const result = await apiClient.createWallet(params);

            expect(result).toEqual(mockResponse);
            expect(mockPost).toHaveBeenCalledTimes(1);
            validateRequest(extractFetchCall(mockPost), "api/2025-06-09/wallets/me", params);
        });

        it("should create MPC wallet successfully", async () => {
            const mockResponse = createMockWalletResponse({ type: "mpc" });
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "mpc",
            };

            const result = await apiClient.createWallet(params);

            expect(result).toEqual(mockResponse);
            expect(mockPost).toHaveBeenCalledTimes(1);
            validateRequest(extractFetchCall(mockPost), "api/2025-06-09/wallets/me", params);
        });

        it("should create Stellar wallet successfully", async () => {
            const mockResponse = createMockWalletResponse({
                address: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
                chainType: "stellar",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
                        locator: "external-wallet:GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
                    },
                },
            } as any);

            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "stellar",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
                    },
                },
            };

            const result = await apiClient.createWallet(params);

            expect(result).toEqual(mockResponse);
            validateRequest(extractFetchCall(mockPost), "api/2025-06-09/wallets/me", params);
        });
    });

    describe("error cases", () => {
        it("should handle API error response with error field", async () => {
            const errorResponse = {
                error: true,
                message: "Wallet creation failed: invalid configuration",
            };

            await testHttpErrorResponse(
                () => apiClient.createWallet({ chainType: "evm", type: "smart" }),
                mockPost,
                errorResponse,
                400
            );
        });

        it("should handle 400 Bad Request error", async () => {
            const errorResponse = {
                error: true,
                message: "Invalid request parameters",
            };

            await testHttpErrorResponse(
                () =>
                    apiClient.createWallet({
                        chainType: "evm",
                        type: "smart",
                        config: { adminSigner: { type: "external-wallet", address: "invalid-address" } },
                    }),
                mockPost,
                errorResponse,
                400
            );
        });

        it("should handle common HTTP error status codes", async () => {
            await testCommonHttpErrors(
                () => apiClient.createWallet({ chainType: "evm", type: "smart" }),
                mockPost,
                [404]
            );
        });

        it("should handle network errors", async () => {
            await testNetworkError(() => apiClient.createWallet({ chainType: "evm", type: "smart" }), mockPost);
        });

        it("should handle invalid JSON response", async () => {
            await testInvalidJsonResponse(() => apiClient.createWallet({ chainType: "evm", type: "smart" }), mockPost);
        });

        it("should handle timeout errors", async () => {
            await testTimeoutError(() => apiClient.createWallet({ chainType: "evm", type: "smart" }), mockPost);
        });

        it("should handle error response without message field", async () => {
            const errorResponse = { error: true };
            await testHttpErrorResponse(
                () => apiClient.createWallet({ chainType: "evm", type: "smart" }),
                mockPost,
                errorResponse,
                500
            );
        });

        it("should handle error response with additional fields", async () => {
            const errorResponse = {
                error: true,
                message: "Custom error",
                code: "WALLET_CREATION_FAILED",
                details: { field: "config" },
            };
            (mockPost as MockedFunction<any>).mockResolvedValue(createMockErrorResponse(errorResponse, 400));
            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });
            expect((result as any).error).toBe(true);
            expect((result as any).message).toBe("Custom error");
            expect((result as any).code).toBe("WALLET_CREATION_FAILED");
        });
    });

    describe("request validation", () => {
        it("should serialize request body correctly", async () => {
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    },
                },
            };

            await apiClient.createWallet(params);

            const call = extractFetchCall(mockPost);
            if (call?.options) {
                expectRequestBody(call.options, params);
            }
        });

        it("should include correct headers", async () => {
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            await apiClient.createWallet({ chainType: "evm", type: "smart" });

            const call = extractFetchCall(mockPost);
            if (call?.options.headers) {
                expectCommonHeaders(call.options.headers);
            }
        });

        it("should handle MPC wallet without config", async () => {
            const mockResponse = createMockWalletResponse({ config: undefined, type: "mpc" });
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "mpc",
            };

            const result = await apiClient.createWallet(params);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            if (call?.options) {
                expectRequestBody(call.options, params);
            }
        });
    });

    describe("response validation", () => {
        it("should parse response correctly with all required fields", async () => {
            const mockResponse = createMockWalletResponse({
                address: "0x9876543210987654321098765432109876543210",
                chainType: "evm",
                type: "smart",
            });
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect(result).toHaveProperty("address");
            expect(result).toHaveProperty("chainType");
            expect(result).toHaveProperty("type");
            expect((result as any).address).toBe((mockResponse as any).address);
        });

        it("should preserve additional response fields", async () => {
            const mockResponse = {
                ...createMockWalletResponse(),
                unexpectedField: "should be preserved",
            };
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect(result as any).toHaveProperty("unexpectedField");
            expect((result as any).unexpectedField).toBe("should be preserved");
        });

        it("should handle response with partial fields", async () => {
            const partialResponse = {
                address: "0x1234567890123456789012345678901234567890",
            };
            mockPost.mockResolvedValue(createMockSuccessResponse(partialResponse));
            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });
            expect(result).toHaveProperty("address");
        });

        it("should handle response with null address", async () => {
            const mockResponse = {
                ...createMockWalletResponse(),
                address: null,
            } as any;
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));
            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });
            expect((result as any).address).toBeNull();
        });
    });

    describe("edge cases", () => {
        it("should handle createWallet with minimal params", async () => {
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.createWallet({ chainType: "evm", type: "mpc" });

            expect(result).toEqual(mockResponse);
        });

        it("should handle createWallet with complex nested config", async () => {
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    },
                },
            };

            const result = await apiClient.createWallet(params);
            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            if (call?.options) {
                expectRequestBody(call.options, params);
            }
        });

        it("should handle createWallet with all chain types", async () => {
            const testCases = [
                { chainType: "evm" as const, type: "smart" as const },
                {
                    chainType: "solana" as const,
                    type: "smart" as const,
                    config: {
                        adminSigner: {
                            type: "external-wallet" as const,
                            address: "ABC123456789012345678901234567890123456789012345",
                        },
                    },
                },
                {
                    chainType: "stellar" as const,
                    type: "smart" as const,
                    config: {
                        adminSigner: {
                            type: "external-wallet" as const,
                            address: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234",
                        },
                    },
                },
            ];

            for (const params of testCases) {
                const mockResponse = createMockWalletResponse({ chainType: params.chainType } as any);
                mockPost.mockResolvedValueOnce(createMockSuccessResponse(mockResponse));

                const result = await apiClient.createWallet(params as CreateWalletParams);
                expect((result as any).chainType).toBe(params.chainType);
            }
            expect(mockPost).toHaveBeenCalledTimes(testCases.length);
        });
    });
});

describe("ApiClient - getWallet()", () => {
    let apiClient: ApiClient;
    let mockGet: MockedFunction<ApiClient["get"]>;

    beforeEach(() => {
        apiClient = createTestApiClient();
        mockGet = vi.spyOn(apiClient, "get") as MockedFunction<ApiClient["get"]>;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("success cases", () => {
        it("should get wallet successfully with me: locator", async () => {
            const mockResponse = createMockWalletResponse();
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const locator = WALLET_LOCATORS.evmSmart;
            const result = await apiClient.getWallet(locator);

            expect(result).toEqual(mockResponse);
            expect(mockGet).toHaveBeenCalledTimes(1);
            validateRequest(extractFetchCall(mockGet), `api/2025-06-09/wallets/${locator}`);
        });

        it("should get wallet successfully with EVM address locator", async () => {
            const mockResponse = createMockWalletResponse();
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const locator = WALLET_LOCATORS.evmAddress;
            const result = await apiClient.getWallet(locator);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockGet);
            expectRequestPath(call, `api/2025-06-09/wallets/${locator}`);
        });

        it("should get Solana wallet successfully", async () => {
            const mockResponse = createMockWalletResponse({
                address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                chainType: "solana",
            });

            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const locator = WALLET_LOCATORS.solanaSmart;
            const result = await apiClient.getWallet(locator);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockGet);
            expectRequestPath(call, `api/2025-06-09/wallets/${locator}`);
        });

        it("should get MPC wallet successfully", async () => {
            const mockResponse = createMockWalletResponse({ type: "mpc" });
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const locator = WALLET_LOCATORS.evmMpc;
            const result = await apiClient.getWallet(locator);

            expect(result).toEqual(mockResponse);
            expectRequestPath(extractFetchCall(mockGet), `api/2025-06-09/wallets/${locator}`);
        });

        it("should get wallet with Solana address locator", async () => {
            const solanaAddress = WALLET_LOCATORS.solanaAddress;
            const mockResponse = createMockWalletResponse({
                address: solanaAddress,
                chainType: "solana",
            });
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.getWallet(solanaAddress);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockGet);
            expectRequestPath(call, `api/2025-06-09/wallets/${solanaAddress}`);
        });
    });

    describe("error cases", () => {
        it("should handle 404 error (wallet not found)", async () => {
            const errorResponse = {
                error: true,
                message: "Wallet not found",
            };

            await testHttpErrorResponse(
                () => apiClient.getWallet(WALLET_LOCATORS.evmSmart),
                mockGet,
                errorResponse,
                404
            );
        });

        it("should handle common HTTP error status codes", async () => {
            await testCommonHttpErrors(() => apiClient.getWallet(WALLET_LOCATORS.evmSmart), mockGet);
        });

        it("should handle network errors", async () => {
            await testNetworkError(() => apiClient.getWallet(WALLET_LOCATORS.evmSmart), mockGet);
        });

        it("should handle invalid JSON response", async () => {
            await testInvalidJsonResponse(() => apiClient.getWallet(WALLET_LOCATORS.evmSmart), mockGet);
        });

        it("should handle timeout errors", async () => {
            await testTimeoutError(() => apiClient.getWallet(WALLET_LOCATORS.evmSmart), mockGet);
        });

        it("should handle error response without message field", async () => {
            const errorResponse = { error: true };
            await testHttpErrorResponse(
                () => apiClient.getWallet(WALLET_LOCATORS.evmSmart),
                mockGet,
                errorResponse,
                500
            );
        });

        it("should handle 404 with detailed error message", async () => {
            const errorResponse = {
                error: true,
                message: "Wallet not found",
                code: "WALLET_NOT_FOUND",
            };
            (mockGet as MockedFunction<any>).mockResolvedValue(createMockErrorResponse(errorResponse, 404));
            const result = await apiClient.getWallet(WALLET_LOCATORS.evmSmart);
            expect((result as any).error).toBe(true);
            expect((result as any).message).toBe("Wallet not found");
        });
    });

    describe("request validation", () => {
        it("should encode wallet locator in URL path correctly", async () => {
            const mockResponse = createMockWalletResponse();
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const locator = WALLET_LOCATORS.evmSmart;
            await apiClient.getWallet(locator);

            const call = extractFetchCall(mockGet);
            expectRequestPath(call, `api/2025-06-09/wallets/${locator}`);
        });

        it("should include correct headers", async () => {
            const mockResponse = createMockWalletResponse();
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            await apiClient.getWallet(WALLET_LOCATORS.evmSmart);

            const call = extractFetchCall(mockGet);
            if (call?.options.headers) {
                expectCommonHeaders(call.options.headers);
            }
        });
    });

    describe("response validation", () => {
        it("should parse response correctly with all required fields", async () => {
            const mockResponse = createMockWalletResponse();
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.getWallet(WALLET_LOCATORS.evmSmart);

            expect(result).toHaveProperty("address");
            expect(result).toHaveProperty("chainType");
            expect(result).toHaveProperty("type");
        });

        it("should preserve additional response fields", async () => {
            const mockResponse = {
                ...createMockWalletResponse(),
                unexpectedField: "should be preserved",
            };

            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.getWallet(WALLET_LOCATORS.evmSmart);

            expect(result as any).toHaveProperty("unexpectedField");
            expect((result as any).unexpectedField).toBe("should be preserved");
        });

        it("should handle response with partial fields", async () => {
            const partialResponse = {
                address: "0x1234567890123456789012345678901234567890",
            };
            mockGet.mockResolvedValue(createMockSuccessResponse(partialResponse));
            const result = await apiClient.getWallet(WALLET_LOCATORS.evmSmart);
            expect(result).toHaveProperty("address");
        });
    });

    describe("edge cases", () => {
        it("should handle getWallet with various locator formats", async () => {
            const locators = [
                WALLET_LOCATORS.evmSmart,
                WALLET_LOCATORS.evmMpc,
                WALLET_LOCATORS.solanaSmart,
                WALLET_LOCATORS.evmAddress,
                WALLET_LOCATORS.solanaAddress,
            ];

            for (const locator of locators) {
                const mockResponse = createMockWalletResponse();
                mockGet.mockResolvedValueOnce(createMockSuccessResponse(mockResponse));

                const result = await apiClient.getWallet(locator);
                expect(result).toEqual(mockResponse);

                const call = extractFetchCall(mockGet);
                expectRequestPath(call, `api/2025-06-09/wallets/${locator}`);
            }
            expect(mockGet).toHaveBeenCalledTimes(locators.length);
        });

        it("should handle getWallet with special characters in address", async () => {
            const mockResponse = createMockWalletResponse();
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.getWallet(WALLET_LOCATORS.evmAddressWithSpecialChars);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockGet);
            expectRequestPath(call, `api/2025-06-09/wallets/${WALLET_LOCATORS.evmAddressWithSpecialChars}`);
        });
    });
});

describe("ApiClient - send()", () => {
    let apiClient: ApiClient;
    let mockPost: MockedFunction<ApiClient["post"]>;

    beforeEach(() => {
        apiClient = createTestApiClient();
        mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("success cases", () => {
        it("should send tokens successfully", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const walletLocator = WALLET_LOCATORS.evmSmart;
            const tokenLocator = TOKEN_LOCATORS.eth;
            const params: SendParams = {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            };

            const result = await apiClient.send(walletLocator, tokenLocator, params);

            expect(result).toEqual(mockResponse);
            expect(mockPost).toHaveBeenCalledTimes(1);
            validateRequest(
                extractFetchCall(mockPost),
                `api/2025-06-09/wallets/${walletLocator}/tokens/${tokenLocator}/transfers`,
                params
            );
        });

        it("should send tokens with custom token locator (contract address)", async () => {
            const mockResponse = createMockSendResponse({ id: "txn-456" });
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const walletLocator = WALLET_LOCATORS.evmSmart;
            const tokenLocator = TOKEN_LOCATORS.customContract;
            const params: SendParams = {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "100.0",
            };

            const result = await apiClient.send(walletLocator, tokenLocator, params);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            expectRequestPath(call, `api/2025-06-09/wallets/${walletLocator}/tokens/${tokenLocator}/transfers`);
        });

        it("should send tokens for Solana wallet", async () => {
            const mockResponse = createMockSendResponse({
                id: "txn-sol-789",
                chainType: "solana",
                walletType: "solana-smart-wallet",
                params: {
                    transaction:
                        "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0",
                    signer: "api-key:test",
                    feeConfig: { feePayer: "crossmint", amount: "0.000005" },
                },
                onChain: {
                    transaction:
                        "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0",
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink:
                        "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                },
            } as any);

            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const walletLocator = WALLET_LOCATORS.solanaSmart;
            const tokenLocator = TOKEN_LOCATORS.sol;
            const params: SendParams = {
                recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                amount: "0.5",
            };

            const result = await apiClient.send(walletLocator, tokenLocator, params);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            expectRequestPath(call, `api/2025-06-09/wallets/${walletLocator}/tokens/${tokenLocator}/transfers`);
        });

        it("should send with very large amount", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: SendParams = {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "999999999999999999.999999999999999999",
            };

            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, params);

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            if (call?.options) {
                expectRequestBody(call.options, params);
            }
        });

        it("should send with small amount", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: SendParams = {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "0.000000000000000001",
            };

            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, params);

            expect(result).toEqual(mockResponse);
        });

        it("should send with zero amount", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: SendParams = {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "0",
            };

            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, params);

            expect(result).toEqual(mockResponse);
        });
    });

    describe("error cases", () => {
        it("should handle API error response with error field", async () => {
            const errorResponse = {
                error: true,
                message: "Insufficient balance",
            };

            await testHttpErrorResponse(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "0x9876543210987654321098765432109876543210",
                        amount: "1000000.0",
                    }),
                mockPost,
                errorResponse,
                400
            );
        });

        it("should handle 400 Bad Request (invalid recipient)", async () => {
            const errorResponse = {
                error: true,
                message: "Invalid recipient address",
            };

            await testHttpErrorResponse(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "invalid-address",
                        amount: "1.5",
                    }),
                mockPost,
                errorResponse,
                400
            );
        });

        it("should handle common HTTP error status codes", async () => {
            await testCommonHttpErrors(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "0x9876543210987654321098765432109876543210",
                        amount: "1.5",
                    }),
                mockPost
            );
        });

        it("should handle network errors", async () => {
            await testNetworkError(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "0x9876543210987654321098765432109876543210",
                        amount: "1.5",
                    }),
                mockPost
            );
        });

        it("should handle invalid JSON response", async () => {
            await testInvalidJsonResponse(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "0x9876543210987654321098765432109876543210",
                        amount: "1.5",
                    }),
                mockPost
            );
        });

        it("should handle timeout errors", async () => {
            await testTimeoutError(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "0x9876543210987654321098765432109876543210",
                        amount: "1.5",
                    }),
                mockPost
            );
        });

        it("should handle error response without message field", async () => {
            const errorResponse = { error: true };
            await testHttpErrorResponse(
                () =>
                    apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                        recipient: "0x9876543210987654321098765432109876543210",
                        amount: "1.5",
                    }),
                mockPost,
                errorResponse,
                500
            );
        });

        it("should handle 400 error with insufficient balance details", async () => {
            const errorResponse = {
                error: true,
                message: "Insufficient balance",
                code: "INSUFFICIENT_BALANCE",
                available: "0.5",
                required: "1.5",
            };
            (mockPost as MockedFunction<any>).mockResolvedValue(createMockErrorResponse(errorResponse, 400));
            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });
            expect((result as any).error).toBe(true);
            expect((result as any).message).toBe("Insufficient balance");
            expect((result as any).code).toBe("INSUFFICIENT_BALANCE");
        });
    });

    describe("request validation", () => {
        it("should serialize request body correctly", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: SendParams = {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            };

            await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, params);

            const call = extractFetchCall(mockPost);
            if (call?.options) {
                expectRequestBody(call.options, params);
            }
        });

        it("should construct URL path correctly with wallet and token locators", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const walletLocator = WALLET_LOCATORS.evmSmart;
            const tokenLocator = TOKEN_LOCATORS.eth;

            await apiClient.send(walletLocator, tokenLocator, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });

            const call = extractFetchCall(mockPost);
            expectRequestPath(call, `api/2025-06-09/wallets/${walletLocator}/tokens/${tokenLocator}/transfers`);
        });

        it("should include correct headers", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });

            const call = extractFetchCall(mockPost);
            if (call?.options.headers) {
                expectCommonHeaders(call.options.headers);
            }
        });
    });

    describe("response validation", () => {
        it("should parse response correctly with all required fields", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });

            expect(result).toHaveProperty("id");
            expect(result).toHaveProperty("status");
            expect(result).toHaveProperty("chainType");
            expect(result).toHaveProperty("walletType");
        });

        it("should preserve additional response fields", async () => {
            const mockResponse = {
                ...createMockSendResponse(),
                unexpectedField: "should be preserved",
            };
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });

            expect(result as any).toHaveProperty("unexpectedField");
            expect((result as any).unexpectedField).toBe("should be preserved");
        });

        it("should handle response with partial fields", async () => {
            const partialResponse = {
                id: "txn-123",
                status: "pending",
            };
            mockPost.mockResolvedValue(createMockSuccessResponse(partialResponse));
            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });
            expect(result).toHaveProperty("id");
            expect(result).toHaveProperty("status");
        });
    });

    describe("edge cases", () => {
        it("should handle send with different token locator formats", async () => {
            const tokenLocators = [
                TOKEN_LOCATORS.eth,
                TOKEN_LOCATORS.usdc,
                TOKEN_LOCATORS.sol,
                TOKEN_LOCATORS.customContract,
                TOKEN_LOCATORS.tokenWithSpecialChars,
            ];

            for (const tokenLocator of tokenLocators) {
                const mockResponse = createMockSendResponse({ id: `txn-${tokenLocator}` });
                mockPost.mockResolvedValueOnce(createMockSuccessResponse(mockResponse));

                const result = await apiClient.send(WALLET_LOCATORS.evmSmart, tokenLocator, {
                    recipient: "0x9876543210987654321098765432109876543210",
                    amount: "1.0",
                });

                expect(result).toEqual(mockResponse);
                const call = extractFetchCall(mockPost);
                expectRequestPath(
                    call,
                    `api/2025-06-09/wallets/${WALLET_LOCATORS.evmSmart}/tokens/${tokenLocator}/transfers`
                );
            }
            expect(mockPost).toHaveBeenCalledTimes(tokenLocators.length);
        });

        it("should handle send with very long recipient address", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const longRecipient = "0x" + "1".repeat(64);
            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: longRecipient,
                amount: "1.0",
            });

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            if (call?.options) {
                const body = JSON.parse(call.options.body as string);
                expect(body.recipient).toBe(longRecipient);
            }
        });

        it("should handle send with scientific notation amount", async () => {
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1e-18",
            });

            expect(result).toEqual(mockResponse);
            const call = extractFetchCall(mockPost);
            if (call?.options) {
                const body = JSON.parse(call.options.body as string);
                expect(body.amount).toBe("1e-18");
            }
        });
    });
});

describe("ApiClient - edge cases and integration scenarios", () => {
    let apiClient: ApiClient;

    beforeEach(() => {
        apiClient = createTestApiClient();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("concurrent requests", () => {
        it("should handle concurrent createWallet calls", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;

            const mockResponse1 = createMockWalletResponse({
                address: "0x1111111111111111111111111111111111111111",
            } as any);
            const mockResponse2 = createMockWalletResponse({
                address: "0x2222222222222222222222222222222222222222",
            } as any);

            mockPost
                .mockResolvedValueOnce(createMockSuccessResponse(mockResponse1))
                .mockResolvedValueOnce(createMockSuccessResponse(mockResponse2));

            const [result1, result2] = await Promise.all([
                apiClient.createWallet({ chainType: "evm", type: "smart" }),
                apiClient.createWallet({ chainType: "evm", type: "mpc" }),
            ]);

            expect(result1).toEqual(mockResponse1);
            expect(result2).toEqual(mockResponse2);
            expect(mockPost).toHaveBeenCalledTimes(2);
        });

        it("should handle concurrent getWallet calls", async () => {
            const mockGet = vi.spyOn(apiClient, "get") as MockedFunction<ApiClient["get"]>;

            const mockResponse1 = createMockWalletResponse({
                address: "0x1111111111111111111111111111111111111111",
            } as any);
            const mockResponse2 = createMockWalletResponse({
                address: "0x2222222222222222222222222222222222222222",
            } as any);

            mockGet
                .mockResolvedValueOnce(createMockSuccessResponse(mockResponse1))
                .mockResolvedValueOnce(createMockSuccessResponse(mockResponse2));

            const [result1, result2] = await Promise.all([
                apiClient.getWallet(WALLET_LOCATORS.evmSmart),
                apiClient.getWallet(WALLET_LOCATORS.evmMpc),
            ]);

            expect(result1).toEqual(mockResponse1);
            expect(result2).toEqual(mockResponse2);
            expect(mockGet).toHaveBeenCalledTimes(2);
        });

        it("should handle concurrent send calls", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;

            const mockResponse1 = createMockSendResponse({ id: "txn-111" });
            const mockResponse2 = createMockSendResponse({ id: "txn-222" });

            mockPost
                .mockResolvedValueOnce(createMockSuccessResponse(mockResponse1))
                .mockResolvedValueOnce(createMockSuccessResponse(mockResponse2));

            const [result1, result2] = await Promise.all([
                apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                    recipient: "0x1111111111111111111111111111111111111111",
                    amount: "1.0",
                }),
                apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                    recipient: "0x2222222222222222222222222222222222222222",
                    amount: "2.0",
                }),
            ]);

            expect(result1).toEqual(mockResponse1);
            expect(result2).toEqual(mockResponse2);
            expect(mockPost).toHaveBeenCalledTimes(2);
        });
    });

    describe("response parsing edge cases", () => {
        it("should handle empty response body gracefully", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const emptyResponse = {
                json: vi.fn().mockResolvedValue({}),
                ok: true,
                status: 200,
            } as unknown as Response;
            mockPost.mockResolvedValue(emptyResponse);

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect(result).toEqual({});
        });

        it("should handle response with null values in nested objects", async () => {
            const mockGet = vi.spyOn(apiClient, "get") as MockedFunction<ApiClient["get"]>;
            const mockResponse = {
                ...createMockWalletResponse(),
                config: null,
            } as any;
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.getWallet(WALLET_LOCATORS.evmSmart);

            expect((result as any).config).toBeNull();
        });

        it("should handle response with undefined fields", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const mockResponse = {
                address: "0x1234567890123456789012345678901234567890",
                chainType: "evm",
                type: "smart",
                config: undefined,
            } as any;
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect((result as any).config).toBeUndefined();
        });

        it("should handle response with array fields", async () => {
            const mockGet = vi.spyOn(apiClient, "get") as MockedFunction<ApiClient["get"]>;
            const mockResponse = {
                ...createMockWalletResponse(),
                tags: ["tag1", "tag2"],
            } as any;
            mockGet.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const result = await apiClient.getWallet(WALLET_LOCATORS.evmSmart);

            expect((result as any).tags).toEqual(["tag1", "tag2"]);
        });

        it("should handle malformed response data", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const malformedData = {};
            mockPost.mockResolvedValue(createMockSuccessResponse(malformedData));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });
            expect(result).toEqual(malformedData);
        });
    });

    describe("server-side vs client-side behavior", () => {
        it("should use correct endpoint for createWallet on server-side", async () => {
            const serverClient = createServerSideApiClient();
            const mockPost = vi.spyOn(serverClient, "post") as MockedFunction<ApiClient["post"]>;
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            await serverClient.createWallet({ chainType: "evm", type: "smart" });

            const call = extractFetchCall(mockPost);
            expectRequestPath(call, "api/2025-06-09/wallets");
        });

        it("should use correct endpoint for createWallet on client-side", async () => {
            const client = createTestApiClient();
            const mockPost = vi.spyOn(client, "post") as MockedFunction<ApiClient["post"]>;
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            await client.createWallet({ chainType: "evm", type: "smart" });

            const call = extractFetchCall(mockPost);
            expectRequestPath(call, "api/2025-06-09/wallets/me");
        });
    });

    describe("error response structure variations", () => {
        it("should handle error with only error field", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const errorResponse = { error: true };
            mockPost.mockResolvedValue(createMockErrorResponse(errorResponse, 400));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect((result as any).error).toBe(true);
        });

        it("should handle error with error and message fields", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const errorResponse = { error: true, message: "Error occurred" };
            mockPost.mockResolvedValue(createMockErrorResponse(errorResponse, 400));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect((result as any).error).toBe(true);
            expect((result as any).message).toBe("Error occurred");
        });

        it("should handle error with nested error details", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const errorResponse = {
                error: true,
                message: "Validation failed",
                details: {
                    field: "config",
                    reason: "Invalid admin signer",
                },
            };
            mockPost.mockResolvedValue(createMockErrorResponse(errorResponse, 400));

            const result = await apiClient.createWallet({ chainType: "evm", type: "smart" });

            expect((result as any).error).toBe(true);
            expect((result as any).details).toEqual(errorResponse.details);
        });
    });

    describe("request serialization edge cases", () => {
        it("should handle request with special characters in JSON", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const mockResponse = createMockWalletResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    },
                },
            };

            await apiClient.createWallet(params);

            const call = extractFetchCall(mockPost);
            if (call?.options.body) {
                const parsed = JSON.parse(call.options.body as string);
                expect(parsed).toEqual(params);
            }
        });

        it("should handle request with unicode characters", async () => {
            const mockPost = vi.spyOn(apiClient, "post") as MockedFunction<ApiClient["post"]>;
            const mockResponse = createMockSendResponse();
            mockPost.mockResolvedValue(createMockSuccessResponse(mockResponse));

            await apiClient.send(WALLET_LOCATORS.evmSmart, TOKEN_LOCATORS.eth, {
                recipient: "0x9876543210987654321098765432109876543210",
                amount: "1.5",
            });

            const call = extractFetchCall(mockPost);
            expect(call?.options.body).toBeDefined();
            if (call?.options.body) {
                expect(() => JSON.parse(call.options.body as string)).not.toThrow();
            }
        });
    });
});
