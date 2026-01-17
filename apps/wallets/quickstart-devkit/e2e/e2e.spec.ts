import { test, expectAuth, TEST_CONFIGURATIONS } from "./fixtures/auth";
import { getWalletAddress, getWalletBalance, transferFunds } from "./helpers";
import { TEST_RECIPIENT_WALLET_ADDRESSES } from "./config/constants";

test.describe("Crossmint Wallet E2E Tests", () => {
    for (const config of TEST_CONFIGURATIONS) {
        test.describe(`${config.provider} - ${config.chain} - ${config.signer}`, () => {
            test.describe.configure({ mode: "serial" });
            test.use({ testConfig: config });

            test("should authenticate and fetch wallet", async ({ authenticatedPage, testConfig }, testInfo) => {
                console.log(`🔐 Testing ${testConfig.provider}/${testConfig.chain}/${testConfig.signer}`);

                await testInfo.attach("authenticated-page", {
                    body: await authenticatedPage.screenshot(),
                    contentType: "image/png",
                });

                await expectAuth(authenticatedPage.locator("h1")).toContainText("Wallets Quickstart");

                const walletAddress = await getWalletAddress(authenticatedPage);
                expectAuth(walletAddress).toBeTruthy();
                expectAuth(walletAddress.length).toBeGreaterThan(10);

                console.log(`✅ ${testConfig.chain}:${testConfig.signer}:${walletAddress} retrieved`);
            });

            test("should transfer funds", async ({ authenticatedPage, testConfig }) => {
                const walletAddress = await getWalletAddress(authenticatedPage);

                const initialBalance = await getWalletBalance(authenticatedPage);
                const initialBalanceNum = parseFloat(initialBalance);

                // Skip transfer test if balance is too low
                if (initialBalanceNum < 0.0001) {
                    console.log(
                        `❌ ${testConfig.chain}:${testConfig.signer}:${walletAddress} wallet balance is too low for transfer test. Skipping...`
                    );
                    console.log(`⚠️ Please fund wallet: ${walletAddress} with some stablecoin to run this test`);
                    test.skip();
                    return;
                }

                let recipientAddress: string;
                if (testConfig.chain === "evm" || walletAddress.startsWith("0x")) {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.evm;
                } else if (testConfig.chain === "solana") {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.solana;
                } else {
                    recipientAddress = walletAddress.startsWith("0x")
                        ? TEST_RECIPIENT_WALLET_ADDRESSES.evm
                        : TEST_RECIPIENT_WALLET_ADDRESSES.solana;
                }

                await transferFunds(authenticatedPage, recipientAddress, "0.0001", testConfig.signer);

                console.log(
                    `✅ ${testConfig.provider}/${testConfig.chain}/${testConfig.signer} transfer completed successfully!`
                );
            });
        });
    }
});
