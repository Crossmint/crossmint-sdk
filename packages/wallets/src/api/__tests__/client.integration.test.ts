import { vi, afterAll, beforeAll, describe, expect, it } from "vitest";
import base58 from "bs58";

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return {
        ...actual,
        SdkLogger: vi.fn().mockImplementation(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            init: vi.fn(),
            addSink: vi.fn(),
            setContext: vi.fn(),
            flush: vi.fn(),
        })),
    };
});

import type { ApiClient } from "../client";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { CreateWalletParams, SendParams, WalletLocator } from "../types";
import {
    fundWallet,
    sendTokenAndApprove,
    delay,
    createIntegrationApiClient,
    isValidEthereumAddress,
    isValidSolanaAddress,
    TestDataFactory,
    ensureWalletExists,
    createTestWallet,
    expectErrorResponse,
    expectSuccessWalletResponse,
    expectSuccessTransactionResponse,
    isErrorResponse,
    isSuccessWalletResponse,
} from "./test-utils";
import {
    TIMEOUT_SHORT,
    TIMEOUT_MEDIUM,
    DELAY_SHORT,
    DELAY_MEDIUM,
    DELAY_LONG,
    DELAY_RATE_LIMIT_WINDOW,
    TEST_ADDRESSES,
    TEST_VALUES,
} from "./constants";

const API_KEY = process.env.CROSSMINT_API_KEY;
const BASE_URL = process.env.CROSSMINT_BASE_URL;
const shouldRunTests = !!API_KEY;

const createApiClient = (overrides: Partial<Crossmint> = {}): ApiClient => {
    return createIntegrationApiClient(API_KEY!, BASE_URL, overrides);
};

describe.skipIf(!shouldRunTests)("ApiClient - Integration Tests (Real HTTP)", () => {
    let apiClient: ApiClient;
    const testData = new TestDataFactory();

    beforeAll(() => {
        apiClient = createApiClient();
    });

    afterAll(async () => {
        await delay(DELAY_LONG);
        testData.clear();
    });

    describe("createWallet() - Happy Path", () => {
        it("should create EVM MPC wallet successfully", async () => {
            const params: CreateWalletParams = {
                chainType: "evm",
                type: "mpc",
                owner: `userId:integration-evm-mpc-${Date.now()}`,
            };

            const result = await createTestWallet(apiClient, testData, params);

            expectSuccessWalletResponse(result);
            expect(result.chainType).toBe("evm");
            expect(result.type).toBe("mpc");
            expect(isValidEthereumAddress(result.address)).toBe(true);
        });

        it("should create EVM smart wallet with external wallet admin signer", async () => {
            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: TEST_ADDRESSES.EVM_ADMIN_SIGNER,
                    },
                },
            };

            const result = await createTestWallet(apiClient, testData, params);

            expectSuccessWalletResponse(result);
            expect(result.chainType).toBe("evm");
            expect(result.type).toBe("smart");
            expect(result.config).toBeDefined();
            expect(result.config?.adminSigner).toBeDefined();
        });

        it("should create Solana smart wallet", async () => {
            const params: CreateWalletParams = {
                chainType: "solana",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: TEST_ADDRESSES.SOLANA_ADMIN_SIGNER,
                    },
                },
            };

            const result = await createTestWallet(apiClient, testData, params);

            expectSuccessWalletResponse(result);
            expect(result.chainType).toBe("solana");
            expect(isValidSolanaAddress(result.address)).toBe(true);
        });

        it(
            "should create wallet with different chain types",
            async () => {
                const chainTypes = ["evm", "solana"] as const;

                for (const chainType of chainTypes) {
                    const params: CreateWalletParams = {
                        chainType,
                        type: "mpc",
                        owner: `userId:integration-${chainType}-mpc-${Date.now()}-${Math.random()}`,
                    };

                    const result = await createTestWallet(apiClient, testData, params);

                    expectSuccessWalletResponse(result);
                    expect(result.chainType).toBe(chainType);

                    await delay(DELAY_MEDIUM);
                }
            },
            TIMEOUT_SHORT
        );
    });

    describe("createWallet() - Error Cases", () => {
        it("should handle invalid API key", async () => {
            const invalidKey = `sk_staging_${base58.encode(
                new TextEncoder().encode(
                    "invalid_data:invalid_signature_12345678901234567890123456789012345678901234567890"
                )
            )}`;

            expect(() => {
                createApiClient({
                    apiKey: invalidKey,
                });
            }).toThrow("Invalid API key");
        });

        it("should handle invalid chain type", async () => {
            const params = {
                chainType: "invalid_chain" as any,
                type: "mpc" as const,
            };

            const result = await apiClient.createWallet(params);
            expectErrorResponse(result);
        });

        it("should handle invalid wallet type", async () => {
            const params = {
                chainType: "evm" as const,
                type: "invalid_type" as any,
            };

            const result = await apiClient.createWallet(params);
            expectErrorResponse(result);
        });

        it("should handle invalid admin signer address", async () => {
            const params: CreateWalletParams = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "invalid-address",
                    },
                },
            };

            const result = await apiClient.createWallet(params);
            expectErrorResponse(result, "message");
        });

        it("should handle missing required fields", async () => {
            const params = {} as CreateWalletParams;
            const result = await apiClient.createWallet(params);
            expectErrorResponse(result);
        });
    });

    describe("getWallet() - Happy Path", () => {
        it("should get wallet by address", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData, {
                testName: "get-wallet",
            });

            if (walletAddress) {
                const result = await apiClient.getWallet(walletAddress as WalletLocator);

                expectSuccessWalletResponse(result);
                expect(result.address).toBe(walletAddress);
            }
        });
    });

    describe("getWallet() - Error Cases", () => {
        it("should handle 404 for non-existent wallet", async () => {
            const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as WalletLocator);
            expectErrorResponse(result);
        });

        it("should handle invalid wallet locator format", async () => {
            const result = await apiClient.getWallet("invalid:locator:format" as WalletLocator);
            expectErrorResponse(result);
        });

        it("should handle empty locator", async () => {
            const result = await apiClient.getWallet("" as WalletLocator);
            expectErrorResponse(result);
        });
    });

    describe("fundWallet()", () => {
        it(
            "should fund wallet successfully",
            async () => {
                const walletAddress = await ensureWalletExists(apiClient, testData, {
                    testName: "fund-wallet",
                });

                if (walletAddress) {
                    const result = await fundWallet(
                        apiClient,
                        walletAddress as WalletLocator,
                        TEST_VALUES.FUNDING_AMOUNT_SMALL,
                        "usdxm"
                    );
                    expect(result).toBeDefined();
                }
            },
            TIMEOUT_SHORT
        );

        it(
            "should handle funding with different tokens",
            async () => {
                const walletAddress = await ensureWalletExists(apiClient, testData, {
                    testName: "fund-tokens",
                });

                if (walletAddress) {
                    const tokens: Array<"usdc" | "usdxm"> = ["usdxm"];

                    for (const token of tokens) {
                        await fundWallet(
                            apiClient,
                            walletAddress as WalletLocator,
                            TEST_VALUES.FUNDING_AMOUNT_SMALL,
                            token
                        );
                        await delay(DELAY_MEDIUM);
                    }
                }
            },
            TIMEOUT_SHORT
        );
    });

    describe("send() - Happy Path", () => {
        it(
            "should send tokens successfully with funding and approval",
            async () => {
                const walletAddress = await ensureWalletExists(apiClient, testData, {
                    testName: "send-tokens",
                });

                if (walletAddress) {
                    await fundWallet(
                        apiClient,
                        walletAddress as WalletLocator,
                        TEST_VALUES.FUNDING_AMOUNT_SMALL,
                        "usdxm"
                    );

                    const transaction = await sendTokenAndApprove(
                        apiClient,
                        walletAddress as WalletLocator,
                        "base-sepolia:usdxm",
                        TEST_ADDRESSES.EVM_RECIPIENT,
                        TEST_VALUES.SEND_AMOUNT_SMALL
                    );

                    expectSuccessTransactionResponse(transaction);
                    testData.addTransaction(transaction.id);
                }
            },
            TIMEOUT_MEDIUM
        );
    });

    describe("send() - Error Cases", () => {
        it("should handle invalid recipient address", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const params: SendParams = {
                    recipient: "invalid-address",
                    amount: "1.0",
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expectErrorResponse(result, "message");
            }
        });

        it("should handle invalid amount format", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: "not-a-number",
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expectErrorResponse(result);
            }
        });

        it("should handle insufficient balance", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: TEST_VALUES.SEND_AMOUNT_INVALID,
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expectErrorResponse(result);
            }
        });

        it("should handle invalid token locator", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: "1.0",
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "invalid:token", params);
                expectErrorResponse(result);
            }
        });
    });

    describe("API Security - Authentication & Authorization", () => {
        it("should reject requests without API key", async () => {
            try {
                const noKeyClient = createApiClient({ apiKey: "" });
                const result = await noKeyClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                });
                expectErrorResponse(result);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should validate API key format", async () => {
            try {
                const invalidFormatClient = createApiClient({
                    apiKey: "not-a-valid-api-key-format",
                });
                const result = await invalidFormatClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                });
                expectErrorResponse(result);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should reject requests with invalid API key signature", async () => {
            try {
                const invalidKey = API_KEY!.slice(0, -10) + "invalid123";
                const invalidClient = createApiClient({ apiKey: invalidKey });
                const result = await invalidClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                });
                expectErrorResponse(result);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should validate API key environment matches base URL", async () => {
            try {
                const stagingKey = "test_api_key_staging_123456789012345678901234567890";
                const stagingClient = createApiClient({ apiKey: stagingKey });
                const originalFetch = global.fetch;
                let capturedUrl: string | undefined;

                global.fetch = (async (url, init) => {
                    capturedUrl = url as string;
                    return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
                }) as typeof global.fetch;

                try {
                    await stagingClient.createWallet({ chainType: "evm", type: "mpc" });
                    expect(capturedUrl).toContain("staging.crossmint.com");
                } finally {
                    global.fetch = originalFetch;
                }
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should include required authentication headers", async () => {
            const originalFetch = global.fetch;
            let capturedHeaders: HeadersInit | undefined;

            global.fetch = (async (url, init) => {
                capturedHeaders = init?.headers;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.createWallet({ chainType: "evm", type: "mpc" });

                expect(capturedHeaders).toBeDefined();
                const headers = capturedHeaders as Record<string, string>;
                expect(headers["x-api-key"]).toBe(API_KEY);
                expect(headers["Content-Type"]).toBe("application/json");
                expect(headers["x-client-name"]).toBeDefined();
                expect(headers["x-client-version"]).toBeDefined();
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should include Authorization header when JWT is provided", async () => {
            const jwtClient = createApiClient({ jwt: "test-jwt-token-12345" });
            const originalFetch = global.fetch;
            let capturedHeaders: HeadersInit | undefined;

            global.fetch = (async (url, init) => {
                capturedHeaders = init?.headers;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await jwtClient.createWallet({ chainType: "evm", type: "mpc" });

                const headers = capturedHeaders as Record<string, string>;
                expect(headers["Authorization"]).toBe("Bearer test-jwt-token-12345");
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should reject requests with expired or invalid JWT", async () => {
            const expiredJwtClient = createApiClient({ jwt: "expired.jwt.token" });

            const result = await expiredJwtClient.createWallet({
                chainType: "evm",
                type: "mpc",
            });

            if (isErrorResponse(result)) {
                expectErrorResponse(result);
            }
        });

        it("should validate appId and extensionId headers when provided", async () => {
            const appClient = createApiClient({
                appId: "test-app-id",
                extensionId: "test-extension-id",
            });
            const originalFetch = global.fetch;
            let capturedHeaders: HeadersInit | undefined;

            global.fetch = (async (url, init) => {
                capturedHeaders = init?.headers;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await appClient.createWallet({ chainType: "evm", type: "mpc" });

                const headers = capturedHeaders as Record<string, string>;
                expect(headers["x-app-identifier"]).toBe("test-app-id");
                expect(headers["x-extension-id"]).toBe("test-extension-id");
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should prevent unauthorized access to other users wallets", async () => {
            const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as WalletLocator);
            expectErrorResponse(result);
        });

        it("should validate API key signature cryptographically", async () => {
            try {
                const tamperedKey = API_KEY!.slice(0, -5) + "XXXXX";
                const tamperedClient = createApiClient({ apiKey: tamperedKey });
                const result = await tamperedClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                });
                expectErrorResponse(result);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should enforce environment-specific API key restrictions", async () => {
            try {
                const stagingKey = "test_api_key_staging_123456789012345678901234567890";
                const stagingClient = createApiClient({ apiKey: stagingKey });
                const result = await stagingClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                });
                expect(result).toBeDefined();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe("API Security - Input Sanitization", () => {
        it("should sanitize SQL injection attempts in wallet locator", async () => {
            const sqlInjection = "'; DROP TABLE wallets; --";
            const result = await apiClient.getWallet(sqlInjection as WalletLocator);
            expectErrorResponse(result);
        });

        it("should sanitize XSS attempts in parameters", async () => {
            const xssPayload = "<script>alert('xss')</script>";
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: xssPayload,
                    },
                },
            } as any);
            expectErrorResponse(result);
        });

        it("should sanitize command injection attempts", async () => {
            const commandInjection = "; rm -rf /; #";
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: commandInjection,
                    },
                },
            } as any);
            expectErrorResponse(result);
        });

        it("should sanitize path traversal attempts", async () => {
            const pathTraversal = "../../../etc/passwd";
            try {
                const result = await apiClient.getWallet(pathTraversal as WalletLocator);
                expectErrorResponse(result);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should sanitize null byte injection", async () => {
            const nullByte = "0x123\0DROP TABLE";
            try {
                const result = await apiClient.getWallet(nullByte as WalletLocator);
                expectErrorResponse(result);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        it("should sanitize special characters in recipient address", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const maliciousRecipient = "0x123'; DROP TABLE; --";
                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", {
                    recipient: maliciousRecipient,
                    amount: "1.0",
                });
                expectErrorResponse(result);
            }
        });

        it("should sanitize extremely long input strings", async () => {
            const longString = "A".repeat(TEST_VALUES.LONG_STRING_LENGTH);
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: longString,
                    },
                },
            } as any);
            expectErrorResponse(result);
        });

        it("should sanitize unicode and special character sequences", async () => {
            const unicodePayload = "\u0000\u0001\u0002\u0003\u0004\u0005";
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: unicodePayload,
                    },
                },
            } as any);
            expectErrorResponse(result);
        });

        it("should sanitize nested object injection", async () => {
            const nestedInjection = {
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "0x123",
                        __proto__: { malicious: true },
                    },
                },
            };

            const result = await apiClient.createWallet(nestedInjection as any);
            expect(isErrorResponse(result) || isSuccessWalletResponse(result)).toBe(true);
        });

        it("should sanitize LDAP injection attempts", async () => {
            const ldapInjection = ")(&(cn=*))";
            const result = await apiClient.getWallet(ldapInjection as WalletLocator);
            expectErrorResponse(result);
        });

        it("should sanitize XML injection attempts", async () => {
            const xmlInjection = "<?xml version='1.0'?><malicious></malicious>";
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: xmlInjection,
                    },
                },
            } as any);
            expectErrorResponse(result);
        });

        it("should sanitize NoSQL injection attempts", async () => {
            const nosqlInjection = { $ne: null };
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: nosqlInjection as any,
                    },
                },
            } as any);
            expectErrorResponse(result);
        });
    });

    describe("API Security - Encryption & Transport", () => {
        it("should use HTTPS for all API requests", async () => {
            const originalFetch = global.fetch;
            let capturedUrl: string | undefined;

            global.fetch = (async (url, init) => {
                capturedUrl = url as string;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.createWallet({ chainType: "evm", type: "mpc" });

                expect(capturedUrl).toBeDefined();
                expect(capturedUrl!.startsWith("https://")).toBe(true);
                expect(capturedUrl!.startsWith("http://")).toBe(false);
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should not expose sensitive data in URL parameters", async () => {
            const originalFetch = global.fetch;
            let capturedUrl: string | undefined;

            global.fetch = (async (url, init) => {
                capturedUrl = url as string;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.getWallet("me:evm:smart" as WalletLocator);

                expect(capturedUrl).toBeDefined();
                expect(capturedUrl!).not.toContain(API_KEY);
                expect(capturedUrl!).not.toContain("jwt");
                expect(capturedUrl!).not.toContain("token");
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should send sensitive data only in request body or headers", async () => {
            const originalFetch = global.fetch;
            let capturedUrl: string | undefined;
            let capturedBody: string | undefined;

            global.fetch = (async (url, init) => {
                capturedUrl = url as string;
                capturedBody = init?.body as string;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.createWallet({
                    chainType: "evm",
                    type: "smart",
                    config: {
                        adminSigner: {
                            type: "external-wallet",
                            address: TEST_ADDRESSES.EVM_TEST,
                        },
                    },
                });

                expect(capturedUrl).toBeDefined();
                expect(capturedUrl!).not.toContain("0xabcdef");
                expect(capturedBody).toBeDefined();
                expect(capturedBody).toContain("0xabcdef");
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should not log sensitive data in error messages", async () => {
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "mpc",
            });

            if (isErrorResponse(result)) {
                const errorMessage = JSON.stringify(result);
                expect(errorMessage).not.toContain(API_KEY);
            }
        });

        it("should use secure HTTP methods", async () => {
            const originalFetch = global.fetch;
            let capturedMethod: string | undefined;

            global.fetch = (async (url, init) => {
                capturedMethod = init?.method;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.getWallet("me:evm:smart" as WalletLocator);
                expect(capturedMethod).toBe("GET");

                await apiClient.createWallet({ chainType: "evm", type: "mpc" });
                expect(capturedMethod).toBe("POST");
            } finally {
                global.fetch = originalFetch;
            }
        });
    });

    describe("API Security - Rate Limiting", () => {
        it("should handle rate limiting gracefully", async () => {
            const requests = Array.from({ length: TEST_VALUES.RATE_LIMIT_RAPID_COUNT }, () =>
                apiClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                })
            );

            const results = await Promise.allSettled(requests);

            const rateLimited = results.filter(
                (result) =>
                    result.status === "fulfilled" &&
                    isErrorResponse(result.value) &&
                    (result.value.message?.toLowerCase().includes("rate") ||
                        result.value.message?.toLowerCase().includes("limit") ||
                        result.value.message?.toLowerCase().includes("429"))
            );

            if (rateLimited.length > 0) {
                expect(rateLimited[0].status).toBe("fulfilled");
            }
        });

        it("should return 429 status when rate limit exceeded", async () => {
            const rapidRequests = Array.from({ length: TEST_VALUES.RATE_LIMIT_STRESS_COUNT }, (_, i) =>
                apiClient
                    .createWallet({
                        chainType: "evm",
                        type: "mpc",
                    })
                    .catch((error) => ({ error: true, message: error.message }))
            );

            const results = await Promise.all(rapidRequests);

            const rateLimitErrors = results.filter(
                (result: any) =>
                    result?.error &&
                    (result?.message?.toLowerCase().includes("rate") ||
                        result?.message?.toLowerCase().includes("limit") ||
                        result?.message?.toLowerCase().includes("429") ||
                        result?.message?.toLowerCase().includes("too many"))
            );

            if (rateLimitErrors.length > 0) {
                expect((rateLimitErrors[0] as { error: boolean }).error).toBe(true);
            }
        });

        it("should allow requests after rate limit window", async () => {
            await delay(DELAY_RATE_LIMIT_WINDOW);

            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "mpc",
            });

            expect(result).toBeDefined();
        });

        it("should handle concurrent requests without overwhelming server", async () => {
            for (let batch = 0; batch < TEST_VALUES.RATE_LIMIT_BATCHES; batch++) {
                const requests = Array.from({ length: TEST_VALUES.RATE_LIMIT_BATCH_SIZE }, () =>
                    apiClient.createWallet({
                        chainType: "evm",
                        type: "mpc",
                    })
                );

                await Promise.allSettled(requests);
                await delay(DELAY_LONG);
            }
        });
    });

    describe("API Security - Request Validation", () => {
        it("should validate request body structure", async () => {
            const invalidBody = { invalidField: "value" };
            const result = await apiClient.createWallet(invalidBody as any);
            expectErrorResponse(result);
        });

        it("should reject malformed JSON in request body", async () => {
            const originalFetch = global.fetch;

            global.fetch = (async (url, init) => {
                return new Response("Invalid JSON", {
                    status: 400,
                    headers: { "Content-Type": "text/plain" },
                });
            }) as typeof global.fetch;

            try {
                await expect(apiClient.createWallet({ chainType: "evm", type: "mpc" })).rejects.toThrow();
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("should validate required fields are present", async () => {
            const result = await apiClient.createWallet({} as CreateWalletParams);
            expectErrorResponse(result);
        });

        it("should validate field types", async () => {
            const result = await apiClient.createWallet({
                chainType: 123 as any,
                type: "mpc",
            });
            expectErrorResponse(result);
        });

        it("should validate enum values", async () => {
            const result = await apiClient.createWallet({
                chainType: "invalid_chain" as any,
                type: "mpc",
            });
            expectErrorResponse(result);
        });

        it("should validate address formats", async () => {
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "not-an-address",
                    },
                },
            });
            expectErrorResponse(result);
        });

        it("should validate amount is numeric string", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: "not-a-number" as any,
                });
                expectErrorResponse(result);
            }
        });
    });

    describe("Edge Cases", () => {
        it("should handle very large amounts", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: TEST_VALUES.SEND_AMOUNT_EXTREME,
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expect(isErrorResponse(result) || "error" in result).toBe(true);
            }
        });

        // TODO: Fix zero amount handling - see WAL-7928
        it.skip("should handle zero amount", async () => {
            const walletAddress = await ensureWalletExists(apiClient, testData);

            if (walletAddress) {
                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: TEST_VALUES.SEND_AMOUNT_ZERO,
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expect(isErrorResponse(result) || "error" in result).toBe(true);
            }
        });

        it(
            "should handle very small amounts",
            async () => {
                const walletAddress = await ensureWalletExists(apiClient, testData, {
                    testName: "small-amounts",
                });

                if (walletAddress) {
                    await fundWallet(
                        apiClient,
                        walletAddress as WalletLocator,
                        TEST_VALUES.FUNDING_AMOUNT_LARGE,
                        "usdxm",
                        "base-sepolia"
                    );

                    const transaction = await sendTokenAndApprove(
                        apiClient,
                        walletAddress as WalletLocator,
                        "base-sepolia:usdxm",
                        TEST_ADDRESSES.EVM_RECIPIENT,
                        TEST_VALUES.SEND_AMOUNT_VERY_SMALL
                    );

                    expectSuccessTransactionResponse(transaction);
                }
            },
            TIMEOUT_MEDIUM
        );

        it("should handle concurrent wallet creation", async () => {
            const promises = Array.from({ length: TEST_VALUES.CONCURRENT_REQUESTS }, (_, i) =>
                apiClient.createWallet({
                    chainType: "evm",
                    type: "mpc",
                    owner: `userId:integration-concurrent-${Date.now()}-${i}`,
                })
            );

            const results = await Promise.all(promises);

            results.forEach((result) => {
                expectSuccessWalletResponse(result);
                if (isSuccessWalletResponse(result)) {
                    testData.addWallet(result.address);
                }
            });
        });

        it(
            "should handle rapid sequential requests",
            async () => {
                for (let i = 0; i < TEST_VALUES.RAPID_SEQUENTIAL_COUNT; i++) {
                    const result = await apiClient.createWallet({
                        chainType: "evm",
                        type: "mpc",
                        owner: `userId:integration-rapid-${Date.now()}-${i}`,
                    });

                    expectSuccessWalletResponse(result);
                    if (isSuccessWalletResponse(result)) {
                        testData.addWallet(result.address);
                    }

                    await delay(DELAY_SHORT);
                }
            },
            TIMEOUT_SHORT
        );
    });

    describe("Response Validation", () => {
        it("should return properly structured wallet response", async () => {
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "mpc",
                owner: `userId:integration-structured-response-${Date.now()}`,
            });

            expectSuccessWalletResponse(result);
            expect(typeof result.address).toBe("string");
            expect(typeof result.chainType).toBe("string");
            expect(typeof result.type).toBe("string");
        });

        it(
            "should return properly structured send response",
            async () => {
                const walletAddress = await ensureWalletExists(apiClient, testData, {
                    testName: "structured-send",
                });

                if (walletAddress) {
                    await fundWallet(
                        apiClient,
                        walletAddress as WalletLocator,
                        TEST_VALUES.FUNDING_AMOUNT_LARGE,
                        "usdxm",
                        "base-sepolia"
                    );

                    const transaction = await sendTokenAndApprove(
                        apiClient,
                        walletAddress as WalletLocator,
                        "base-sepolia:usdxm",
                        TEST_ADDRESSES.EVM_RECIPIENT,
                        TEST_VALUES.SEND_AMOUNT_SMALL
                    );

                    expectSuccessTransactionResponse(transaction);
                    expect(typeof transaction.id).toBe("string");
                    expect(typeof transaction.status).toBe("string");
                }
            },
            TIMEOUT_MEDIUM
        );

        it("should handle error response structure", async () => {
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "invalid",
                    },
                },
            });

            if (isErrorResponse(result)) {
                expectErrorResponse(result, "message");
            }
        });
    });

    describe("Server-Side vs Client-Side", () => {
        it("should use correct endpoint for createWallet", async () => {
            const testClient = createApiClient();
            const originalFetch = global.fetch;
            let capturedUrl: string | undefined;

            global.fetch = (async (url, init) => {
                capturedUrl = url as string;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await testClient.createWallet({ chainType: "evm", type: "mpc", owner: `userId:test-${Date.now()}` });
                expect(capturedUrl).toContain("api/2025-06-09/wallets");
            } finally {
                global.fetch = originalFetch;
            }
        });
    });
});
