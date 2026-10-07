import { afterAll, beforeAll, describe, expect, it } from "vitest";
import base58 from "bs58";
import type { CreateWalletParams, WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { createIntegrationApiClient } from "../shared/client";
import {
    createTestWallet,
    delay,
    createFreshWallet,
    expectErrorResponse,
    expectSuccessWalletResponse,
    isValidEthereumAddress,
    isValidSolanaAddress,
    TestDataFactory,
} from "./test-utils";
import { DELAY_LONG, DELAY_MEDIUM, TEST_ADDRESSES, TIMEOUT_SHORT } from "./constants";

describe("Wallets — creation & retrieval (Real HTTP)", () => {
    let apiClient: WalletsApiClient;
    const testData = new TestDataFactory();

    beforeAll(() => {
        apiClient = createIntegrationApiClient();
    });

    afterAll(async () => {
        await delay(DELAY_LONG);
        testData.clear();
    });

    describe("createWallet() - Happy Path", () => {
        // MPC wallets are not enabled on the preview project (contact support to enable)
        it.skip("creates EVM MPC wallet successfully", async () => {
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

        it("creates EVM smart wallet with external wallet admin signer", async () => {
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

        it("creates Solana smart wallet", async () => {
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

        // MPC wallets are not enabled on the preview project (contact support to enable)
        it.skip(
            "creates wallet with different chain types",
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
        it("handles invalid API key", async () => {
            const invalidKey = `sk_staging_${base58.encode(
                new TextEncoder().encode(
                    "invalid_data:invalid_signature_12345678901234567890123456789012345678901234567890"
                )
            )}`;

            expect(() => {
                createIntegrationApiClient({
                    apiKey: invalidKey,
                });
            }).toThrow("Invalid API key");
        });

        it("handles invalid chain type", async () => {
            const params = {
                chainType: "invalid_chain" as any,
                type: "mpc" as const,
            };

            const result = await apiClient.createWallet(params);
            expectErrorResponse(result);
        });

        it("handles invalid wallet type", async () => {
            const params = {
                chainType: "evm" as const,
                type: "invalid_type" as any,
            };

            const result = await apiClient.createWallet(params);
            expectErrorResponse(result);
        });

        it("handles invalid admin signer address", async () => {
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

        it("handles missing required fields", async () => {
            const params = {} as CreateWalletParams;
            const result = await apiClient.createWallet(params);
            expectErrorResponse(result);
        });
    });

    describe("getWallet() - Happy Path", () => {
        it("gets wallet by address", async () => {
            const { address: walletAddress } = await createFreshWallet(apiClient, testData, {
                testName: "get-wallet",
            });

            const result = await apiClient.getWallet(walletAddress as WalletLocator);

            expectSuccessWalletResponse(result);
            expect(result.address).toBe(walletAddress);
        });
    });

    describe("getWallet() - Error Cases", () => {
        it("handles 404 for non-existent wallet", async () => {
            const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as WalletLocator);
            expectErrorResponse(result);
        });

        it("handles invalid wallet locator format", async () => {
            const result = await apiClient.getWallet("invalid:locator:format" as WalletLocator);
            expectErrorResponse(result);
        });

        it("handles empty locator", async () => {
            const result = await apiClient.getWallet("" as WalletLocator);
            expectErrorResponse(result);
        });
    });
});
