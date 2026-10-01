import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SendParams, WalletLocator, WalletsApiClient } from "@crossmint/wallets-sdk";
import { createIntegrationApiClient } from "../shared/client";
import {
    delay,
    createFreshWallet,
    expectErrorResponse,
    expectSuccessTransactionResponse,
    fundWallet,
    fundWalletAndWait,
    sendTokenAndApprove,
    TestDataFactory,
    waitForFundedBalance,
} from "./test-utils";
import { DELAY_LONG, TEST_ADDRESSES, TEST_VALUES, TIMEOUT_MEDIUM } from "./constants";

function expectFundedBalance(result: unknown, token: string) {
    expect(Array.isArray(result), `expected a balance array, got: ${JSON.stringify(result)}`).toBe(true);
    const entry = (result as Array<{ symbol: string; amount: string }>).find((balance) => balance.symbol === token);
    expect(entry, `no "${token}" entry in: ${JSON.stringify(result)}`).toBeDefined();
    expect(entry!.amount).not.toBe("0");
}

describe("Wallets — funding & transfers (Real HTTP)", () => {
    let apiClient: WalletsApiClient;
    const testData = new TestDataFactory();

    beforeAll(() => {
        apiClient = createIntegrationApiClient();
    });

    afterAll(async () => {
        await delay(DELAY_LONG);
        testData.clear();
    });

    describe("fundWallet()", () => {
        it(
            "funds wallet successfully",
            async () => {
                const { address: walletAddress } = await createFreshWallet(apiClient, testData, {
                    testName: "fund-wallet",
                });

                const fundResult = await fundWallet(
                    apiClient,
                    walletAddress as WalletLocator,
                    TEST_VALUES.FUNDING_AMOUNT_SMALL,
                    "usdxm"
                );
                expect("txId" in fundResult, `expected a txId, got: ${JSON.stringify(fundResult)}`).toBe(true);

                const balance = await waitForFundedBalance(apiClient, walletAddress as WalletLocator, "usdxm");
                expectFundedBalance(balance, "usdxm");
            },
            TIMEOUT_MEDIUM
        );
    });

    describe("send() - Happy Path", () => {
        it(
            "sends tokens successfully with funding and approval",
            async () => {
                const { address: walletAddress, signer } = await createFreshWallet(apiClient, testData, {
                    testName: "send-tokens",
                });

                await fundWalletAndWait(
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
                    TEST_VALUES.SEND_AMOUNT_SMALL,
                    signer
                );

                expectSuccessTransactionResponse(transaction);
                expect(transaction.status).toBe("success");
                testData.addTransaction(transaction.id);
            },
            TIMEOUT_MEDIUM
        );
    });

    describe("send() - Error Cases", () => {
        it(
            "handles invalid recipient address",
            async () => {
                const { address: walletAddress } = await createFreshWallet(apiClient, testData);

                const params: SendParams = {
                    recipient: "invalid-address",
                    amount: "1.0",
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expectErrorResponse(result, "message");
            },
            TIMEOUT_MEDIUM
        );

        it(
            "handles invalid amount format",
            async () => {
                const { address: walletAddress } = await createFreshWallet(apiClient, testData);

                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: "not-a-number",
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expectErrorResponse(result, "message");
            },
            TIMEOUT_MEDIUM
        );

        it(
            "handles insufficient balance",
            async () => {
                const { address: walletAddress } = await createFreshWallet(apiClient, testData);

                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: TEST_VALUES.SEND_AMOUNT_INVALID,
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "base-sepolia:usdxm", params);
                expectErrorResponse(result, "message");
                expect((result as { message: string }).message.toLowerCase()).toContain("insufficient");
            },
            TIMEOUT_MEDIUM
        );

        it(
            "handles invalid token locator",
            async () => {
                const { address: walletAddress } = await createFreshWallet(apiClient, testData);

                const params: SendParams = {
                    recipient: TEST_ADDRESSES.EVM_RECIPIENT,
                    amount: "1.0",
                };

                const result = await apiClient.send(walletAddress as WalletLocator, "invalid:token", params);
                expectErrorResponse(result, "message");
            },
            TIMEOUT_MEDIUM
        );
    });
});
