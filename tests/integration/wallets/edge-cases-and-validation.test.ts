import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SendParams, WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { createIntegrationApiClient } from "../shared/client";
import {
    delay,
    createFreshWallet,
    expectErrorResponse,
    expectSuccessTransactionResponse,
    expectSuccessWalletResponse,
    fundWalletAndWait,
    isErrorResponse,
    sendTokenAndApprove,
    TestDataFactory,
} from "./test-utils";
import { DELAY_LONG, DELAY_SHORT, TEST_ADDRESSES, TEST_VALUES, TIMEOUT_MEDIUM, TIMEOUT_SHORT } from "./constants";

describe("Wallets — edge cases & response validation (Real HTTP)", () => {
    let apiClient: WalletsApiClient;
    const testData = new TestDataFactory();

    beforeAll(() => {
        apiClient = createIntegrationApiClient();
    });

    afterAll(async () => {
        await delay(DELAY_LONG);
        testData.clear();
    });

    describe("Edge Cases", () => {
        it("handles very large amounts", async () => {
            const { address: walletAddress } = await createFreshWallet(apiClient, testData);

            const params: SendParams = {
                recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                amount: TEST_VALUES.SEND_AMOUNT_EXTREME,
            };

            const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
            expectErrorResponse(result);
        });

        // TODO: Fix zero amount handling - see WAL-7928
        it.skip("handles zero amount", async () => {
            const { address: walletAddress } = await createFreshWallet(apiClient, testData);

            const params: SendParams = {
                recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                amount: TEST_VALUES.SEND_AMOUNT_ZERO,
            };

            const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
            expectErrorResponse(result);
        });

        it(
            "handles very small amounts",
            async () => {
                const { address: walletAddress, signer } = await createFreshWallet(apiClient, testData, {
                    testName: "small-amounts",
                });

                await fundWalletAndWait(
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
                    TEST_VALUES.SEND_AMOUNT_VERY_SMALL,
                    signer
                );

                expectSuccessTransactionResponse(transaction);
                expect(transaction.status).toBe("success");
            },
            TIMEOUT_MEDIUM
        );

        it("handles concurrent wallet creation", async () => {
            const promises = Array.from({ length: TEST_VALUES.CONCURRENT_REQUESTS }, (_, i) =>
                apiClient.createWallet({
                    chainType: "evm",
                    type: "smart",
                    owner: `userId:integration-concurrent-${Date.now()}-${i}`,
                    config: { adminSigner: { type: "external-wallet", address: TEST_ADDRESSES.EVM_ADMIN_SIGNER } },
                } as Parameters<typeof apiClient.createWallet>[0])
            );

            const results = await Promise.all(promises);

            results.forEach((result) => {
                expectSuccessWalletResponse(result);
                testData.addWallet(result.address);
            });
        });

        it(
            "handles rapid sequential requests",
            async () => {
                for (let i = 0; i < TEST_VALUES.RAPID_SEQUENTIAL_COUNT; i++) {
                    const result = await apiClient.createWallet({
                        chainType: "evm",
                        type: "smart",
                        owner: `userId:integration-rapid-${Date.now()}-${i}`,
                        config: { adminSigner: { type: "external-wallet", address: TEST_ADDRESSES.EVM_ADMIN_SIGNER } },
                    } as Parameters<typeof apiClient.createWallet>[0]);

                    expectSuccessWalletResponse(result);
                    testData.addWallet(result.address);

                    await delay(DELAY_SHORT);
                }
            },
            TIMEOUT_SHORT
        );
    });

    describe("Response Validation", () => {
        it("returns properly structured wallet response", async () => {
            const result = await apiClient.createWallet({
                chainType: "evm",
                type: "smart",
                owner: `userId:integration-structured-response-${Date.now()}`,
                config: { adminSigner: { type: "external-wallet", address: TEST_ADDRESSES.EVM_ADMIN_SIGNER } },
            } as Parameters<typeof apiClient.createWallet>[0]);

            expectSuccessWalletResponse(result);
            expect(typeof result.address).toBe("string");
            expect(typeof result.chainType).toBe("string");
            expect(typeof result.type).toBe("string");
        });

        it(
            "returns properly structured send response",
            async () => {
                const { address: walletAddress, signer } = await createFreshWallet(apiClient, testData, {
                    testName: "structured-send",
                });

                await fundWalletAndWait(
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
                    TEST_VALUES.SEND_AMOUNT_SMALL,
                    signer
                );

                expectSuccessTransactionResponse(transaction);
                expect(transaction.status).toBe("success");
            },
            TIMEOUT_MEDIUM
        );

        it("handles error response structure", async () => {
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
        it("uses correct endpoint for createWallet", async () => {
            const testClient = createIntegrationApiClient();
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
