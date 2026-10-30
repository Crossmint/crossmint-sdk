import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateWalletParams, WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { createIntegrationApiClient } from "../shared/client";
import {
    createTestWallet,
    delay,
    createFreshWallet,
    expectErrorResponse,
    expectSuccessWalletResponse,
    isValidSolanaAddress,
    TestDataFactory,
} from "./test-utils";
import { DELAY_LONG, TEST_ADDRESSES } from "./constants";

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

    describe("createWallet()", () => {
        it("creates an EVM smart wallet with an external-wallet admin signer", async () => {
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
            expect(result.config?.adminSigner).toBeDefined();
        });

        it("creates a Solana smart wallet", async () => {
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
    });

    describe("getWallet()", () => {
        it("returns the wallet that was just created", async () => {
            const { address: walletAddress } = await createFreshWallet(apiClient, testData, {
                testName: "get-wallet",
            });

            const result = await apiClient.getWallet(walletAddress as WalletLocator);

            expectSuccessWalletResponse(result);
            expect(result.address).toBe(walletAddress);
        });

        it("surfaces the API's not-found rejection to the caller", async () => {
            const result = await apiClient.getWallet(TEST_ADDRESSES.EVM_NON_EXISTENT as WalletLocator);

            expectErrorResponse(result);
        });
    });
});
