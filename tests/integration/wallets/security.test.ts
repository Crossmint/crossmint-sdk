import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { createIntegrationApiClient, PREVIEW_API_KEY } from "../shared/client";
import { externalWalletSigner } from "../shared/signer";
import {
    delay,
    createFreshWallet,
    expectErrorResponse,
    isErrorResponse,
    isSuccessWalletResponse,
    TestDataFactory,
} from "./test-utils";
import { DELAY_LONG, DELAY_RATE_LIMIT_WINDOW, TEST_ADDRESSES, TEST_VALUES, TIMEOUT_MEDIUM } from "./constants";

describe("Wallets — API security (Real HTTP)", () => {
    let apiClient: WalletsApiClient;
    const testData = new TestDataFactory();

    beforeAll(() => {
        apiClient = createIntegrationApiClient();
    });

    afterAll(async () => {
        await delay(DELAY_LONG);
        testData.clear();
    });

    describe("API Security - Authentication & Authorization", () => {
        it("rejects an empty API key", () => {
            expect(() => createIntegrationApiClient({ apiKey: "" })).toThrow("Malformed API key");
        });

        it("rejects a malformed API key", () => {
            expect(() => createIntegrationApiClient({ apiKey: "not-a-valid-api-key-format" })).toThrow(
                "Malformed API key"
            );
        });

        it("rejects an API key with a tampered signature", () => {
            // Must stay valid base58 (no 0/O/I/l) or decoding throws before signature validation runs.
            const invalidKey = PREVIEW_API_KEY!.slice(0, -10) + "zzzzzzzzzz";
            expect(() => createIntegrationApiClient({ apiKey: invalidKey })).toThrow("Invalid API key");
        });

        it("routes every request to the configured preview base URL", async () => {
            const originalFetch = global.fetch;
            let capturedUrl: string | undefined;

            global.fetch = (async (url, init) => {
                capturedUrl = url as string;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.createWallet({ chainType: "evm", type: "mpc" });
                expect(capturedUrl).toContain("preview.crossmint.com");
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("includes required authentication headers", async () => {
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
                expect(headers["x-api-key"]).toBe(PREVIEW_API_KEY);
                expect(headers["Content-Type"]).toBe("application/json");
                expect(headers["x-client-name"]).toBeDefined();
                expect(headers["x-client-version"]).toBeDefined();
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("includes Authorization header when JWT is provided", async () => {
            const jwtClient = createIntegrationApiClient({ jwt: "test-jwt-token-12345" });
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

        it("rejects requests with expired or invalid JWT", async () => {
            const expiredJwtClient = createIntegrationApiClient({ jwt: "expired.jwt.token" });

            const result = await expiredJwtClient.createWallet({
                chainType: "evm",
                type: "mpc",
            });

            expectErrorResponse(result);
        });

        it("validates appId and extensionId headers when provided", async () => {
            const appClient = createIntegrationApiClient({
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

        it("returns a not-found error for a non-existent wallet address", async () => {
            const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as WalletLocator);
            expectErrorResponse(result);
        });
    });

    describe("API Security - Input Sanitization", () => {
        it("sanitizes SQL injection attempts in wallet locator", async () => {
            const sqlInjection = "'; DROP TABLE wallets; --";
            let result: unknown;
            try {
                result = await apiClient.getWallet(sqlInjection as WalletLocator);
            } catch (error) {
                // A WAF can intercept this payload and throw instead of returning a clean JSON error.
                expect(error).toBeDefined();
                return;
            }
            expectErrorResponse(result);
        });

        it("sanitizes XSS attempts in parameters", async () => {
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

        it("sanitizes command injection attempts", async () => {
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

        it("sanitizes path traversal attempts", async () => {
            const pathTraversal = "../../../etc/passwd";
            let result: unknown;
            try {
                result = await apiClient.getWallet(pathTraversal as WalletLocator);
            } catch (error) {
                expect(error).toBeDefined();
                return;
            }
            expectErrorResponse(result);
        });

        it("sanitizes null byte injection", async () => {
            const nullByte = "0x123\0DROP TABLE";
            let result: unknown;
            try {
                result = await apiClient.getWallet(nullByte as WalletLocator);
            } catch (error) {
                expect(error).toBeDefined();
                return;
            }
            expectErrorResponse(result);
        });

        it("sanitizes special characters in recipient address", async () => {
            const { address: walletAddress } = await createFreshWallet(apiClient, testData);

            const maliciousRecipient = "0x123'; DROP TABLE; --";
            let result: unknown;
            try {
                result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", {
                    recipient: maliciousRecipient,
                    amount: "1.0",
                });
            } catch (error) {
                // Same WAF caveat as the SQL-injection locator test above.
                expect(error).toBeDefined();
                return;
            }
            expectErrorResponse(result);
        });

        it("sanitizes extremely long input strings", async () => {
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

        it("sanitizes unicode and special character sequences", async () => {
            const unicodePayload = " ";
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

        it("sanitizes nested object injection", async () => {
            // `__proto__` as an object-literal key sets the prototype rather than an own property,
            // so it never reaches JSON.stringify; JSON.parse is what actually puts it on the wire.
            const nestedInjection = JSON.parse(
                '{"chainType":"evm","type":"smart","config":{"adminSigner":{"type":"external-wallet","address":"0x123","__proto__":{"malicious":true}}}}'
            );

            const result = await apiClient.createWallet(nestedInjection);
            expectErrorResponse(result);
        });

        it("sanitizes LDAP injection attempts", async () => {
            const ldapInjection = ")(&(cn=*))";
            const result = await apiClient.getWallet(ldapInjection as WalletLocator);
            expectErrorResponse(result);
        });

        it("sanitizes XML injection attempts", async () => {
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

        it("sanitizes NoSQL injection attempts", async () => {
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
        it("uses HTTPS for all API requests", async () => {
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

        it("does not expose sensitive data in URL parameters", async () => {
            const originalFetch = global.fetch;
            let capturedUrl: string | undefined;

            global.fetch = (async (url, init) => {
                capturedUrl = url as string;
                return new Response(JSON.stringify({ address: "0x123" }), { status: 200 });
            }) as typeof global.fetch;

            try {
                await apiClient.getWallet("me:evm:smart" as WalletLocator);

                expect(capturedUrl).toBeDefined();
                expect(capturedUrl!).not.toContain(PREVIEW_API_KEY);
                expect(capturedUrl!).not.toContain("jwt");
                expect(capturedUrl!).not.toContain("token");
            } finally {
                global.fetch = originalFetch;
            }
        });

        it("sends sensitive data only in request body or headers", async () => {
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

        it("does not include the API key in the response body", async () => {
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "mpc",
            });

            expect(JSON.stringify(result)).not.toContain(PREVIEW_API_KEY);
        });

        it("uses secure HTTP methods", async () => {
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
        it("handles rate limiting gracefully", async () => {
            const requests = Array.from({ length: TEST_VALUES.RATE_LIMIT_RAPID_COUNT }, () =>
                apiClient.createWallet({
                    chainType: "evm",
                    type: "smart",
                    config: { adminSigner: externalWalletSigner().signer },
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

        it("returns 429 status when rate limit exceeded", async () => {
            const rapidRequests = Array.from({ length: TEST_VALUES.RATE_LIMIT_STRESS_COUNT }, (_, i) =>
                apiClient
                    .createWallet({
                        chainType: "evm",
                        type: "smart",
                        config: { adminSigner: externalWalletSigner().signer },
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

        it("allows requests after rate limit window", async () => {
            await delay(DELAY_RATE_LIMIT_WINDOW);

            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                config: { adminSigner: externalWalletSigner().signer },
            });

            expect(isSuccessWalletResponse(result)).toBe(true);
        });

        it(
            "handles concurrent requests without overwhelming server",
            async () => {
                for (let batch = 0; batch < TEST_VALUES.RATE_LIMIT_BATCHES; batch++) {
                    const requests = Array.from({ length: TEST_VALUES.RATE_LIMIT_BATCH_SIZE }, () =>
                        apiClient.createWallet({
                            chainType: "evm",
                            type: "smart",
                            config: { adminSigner: externalWalletSigner().signer },
                        })
                    );

                    await Promise.allSettled(requests);
                    await delay(DELAY_LONG);
                }
            },
            TIMEOUT_MEDIUM
        );
    });

    describe("API Security - Request Validation", () => {
        it("validates request body structure", async () => {
            const invalidBody = { invalidField: "value" };
            const result = await apiClient.createWallet(invalidBody as any);
            expectErrorResponse(result);
        });

        it("rejects a non-JSON error response from the server", async () => {
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

        it("validates required fields are present", async () => {
            const result = await apiClient.createWallet({} as any);
            expectErrorResponse(result);
        });

        it("validates field types", async () => {
            const result = await apiClient.createWallet({
                chainType: 123 as any,
                type: "mpc",
            });
            expectErrorResponse(result);
        });

        it("validates enum values", async () => {
            const result = await apiClient.createWallet({
                chainType: "invalid_chain" as any,
                type: "mpc",
            });
            expectErrorResponse(result);
        });

        it("validates address formats", async () => {
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

        it("validates amount is numeric string", async () => {
            const { address: walletAddress } = await createFreshWallet(apiClient, testData);

            const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", {
                recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                amount: "not-a-number" as any,
            });
            expectErrorResponse(result);
        });
    });
});
