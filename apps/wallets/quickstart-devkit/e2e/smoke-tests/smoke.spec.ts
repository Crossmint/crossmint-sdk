import { test, expectAuth } from "../fixtures/auth";
import {
    getWalletAddress,
    getWalletBalance,
    getWalletBalances,
    getWalletActivity,
    transferFunds,
    createPreparedTransaction,
    approveTransactionById,
} from "../helpers";
import { TEST_RECIPIENT_WALLET_ADDRESSES } from "../config/constants";

const SMOKE_TEST_CONFIG = {
    provider: "crossmint",
    chain: "evm",
    signer: "email",
    chainId: "base-sepolia",
    alias: undefined,
} as const;

test.describe("Crossmint Wallet Smoke Tests", () => {
    test.describe.configure({ mode: "serial" });
    test.use({ testConfig: SMOKE_TEST_CONFIG });

    test("should authenticate and create wallet", async ({ authenticatedPage }, testInfo) => {
        await testInfo.attach("authenticated-page", {
            body: await authenticatedPage.screenshot(),
            contentType: "image/png",
        });

        await expectAuth(authenticatedPage.locator("h1")).toContainText("Wallets Quickstart");

        const walletAddress = await getWalletAddress(authenticatedPage);
        expectAuth(walletAddress).toBeTruthy();
        expectAuth(walletAddress.length).toBeGreaterThan(10);
        expectAuth(walletAddress.startsWith("0x")).toBe(true);

        expectAuth(walletAddress.length).toBe(42);
        expectAuth(/^0x[a-fA-F0-9]{40}$/.test(walletAddress)).toBe(true);

        const addressElement = authenticatedPage.locator(`[data-testid^="wallet-address:${walletAddress}"]`);
        await expectAuth(addressElement).toBeVisible();
    });

    test("should fetch wallet balances via SDK", async ({ authenticatedPage }) => {
        const balances = await getWalletBalances(authenticatedPage);

        expectAuth(balances).toBeTruthy();
        expectAuth(typeof balances).toBe("object");
        expectAuth(balances.nativeToken).toBeTruthy();
        expectAuth(balances.usdc).toBeTruthy();
        expectAuth(Array.isArray(balances.tokens)).toBe(true);

        expectAuth(balances.nativeToken.amount).toBeTruthy();
        expectAuth(balances.nativeToken.symbol).toBeTruthy();
        expectAuth(balances.nativeToken.symbol.toLowerCase()).toBe("eth");
        const nativeAmount = parseFloat(balances.nativeToken.amount);
        expectAuth(Number.isFinite(nativeAmount)).toBe(true);
        expectAuth(nativeAmount).toBeGreaterThanOrEqual(0);

        expectAuth(balances.usdc.amount).toBeTruthy();
        expectAuth(balances.usdc.symbol.toLowerCase()).toBe("usdc");
        const usdcAmount = parseFloat(balances.usdc.amount);
        expectAuth(Number.isFinite(usdcAmount)).toBe(true);
        expectAuth(usdcAmount).toBeGreaterThanOrEqual(0);

        expectAuth(/^\d+(\.\d+)?$/.test(balances.nativeToken.amount)).toBe(true);
        expectAuth(/^\d+(\.\d+)?$/.test(balances.usdc.amount)).toBe(true);
    });

    test("should fetch wallet activity", async ({ authenticatedPage }) => {
        const activity = await getWalletActivity(authenticatedPage);

        expectAuth(activity).toBeTruthy();
        expectAuth(typeof activity).toBe("object");
        expectAuth(activity.events).toBeTruthy();
        expectAuth(Array.isArray(activity.events)).toBe(true);
        expectAuth(activity.events.length).toBeGreaterThanOrEqual(0);

        if (activity.events.length > 0) {
            const firstEvent = activity.events[0];

            expectAuth(firstEvent.type).toBeTruthy();
            expectAuth(typeof firstEvent.type).toBe("string");
            expectAuth(firstEvent.timestamp).toBeTruthy();
            expectAuth(typeof firstEvent.timestamp).toBe("string");

            expectAuth(firstEvent.timestamp.length).toBeGreaterThan(0);

            if (firstEvent.amount) {
                expectAuth(typeof firstEvent.amount).toBe("string");
                expectAuth(Number.isFinite(parseFloat(firstEvent.amount))).toBe(true);
            }
            if (firstEvent.token_symbol) {
                expectAuth(typeof firstEvent.token_symbol).toBe("string");
            }
            if (firstEvent.transaction_hash) {
                expectAuth(typeof firstEvent.transaction_hash).toBe("string");
                expectAuth(firstEvent.transaction_hash.length).toBeGreaterThan(0);
            }
        }
    });

    test("should transfer funds", async ({ authenticatedPage, testConfig }) => {
        const walletAddress = await getWalletAddress(authenticatedPage);

        // Check wallet balance and skip if 0
        const balance = await getWalletBalance(authenticatedPage);
        const balanceNum = parseFloat(balance);

        if (balanceNum === 0) {
            console.log(`⚠️ Wallet ${walletAddress} has 0 balance. Skipping transfer test.`);
            console.log(`💡 Please fund wallet: ${walletAddress} with some USDC to run this test`);
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

    test("should create and approve a prepared transaction", async ({ authenticatedPage, testConfig }) => {
        const recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.evm;
        const transferAmount = "0.0001";
        const walletAddress = await getWalletAddress(authenticatedPage);

        expectAuth(recipientAddress).toBeTruthy();
        expectAuth(recipientAddress.startsWith("0x")).toBe(true);
        expectAuth(recipientAddress.length).toBe(42);
        expectAuth(/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)).toBe(true);

        // Check wallet balance and skip if 0
        const initialBalance = await getWalletBalance(authenticatedPage);
        const initialBalanceNum = parseFloat(initialBalance);

        if (initialBalanceNum === 0) {
            console.log(`⚠️ Wallet ${walletAddress} has 0 balance. Skipping approval test.`);
            console.log(`💡 Please fund wallet: ${walletAddress} with some USDC to run this test`);
            test.skip();
            return;
        }

        //check approval test heading
        const approvalTestHeading = authenticatedPage.locator("text=/Approval Method Test/i").first();
        await approvalTestHeading.scrollIntoViewIfNeeded();
        await expectAuth(approvalTestHeading).toBeVisible();

        const transactionId = await createPreparedTransaction(
            authenticatedPage,
            recipientAddress,
            transferAmount,
            "usdc",
            testConfig.signer
        );

        expectAuth(transactionId).toBeTruthy();
        expectAuth(typeof transactionId).toBe("string");
        expectAuth(transactionId.length).toBeGreaterThan(0);
        expectAuth(transactionId.startsWith("txn-") || transactionId.length > 10).toBe(true);

        const transactionIdDisplay = authenticatedPage.locator(`text=/Prepared Transaction ID:/i`).first();
        await expectAuth(transactionIdDisplay).toBeVisible();

        await approveTransactionById(authenticatedPage, transactionId, testConfig.signer);

        const approvalResult = authenticatedPage.locator("text=/Approval Result/i").first();
        await expectAuth(approvalResult).toBeVisible();

        const resultSection = approvalResult.locator("..");
        const resultText = await resultSection.textContent();
        expectAuth(resultText).toBeTruthy();
        expectAuth(resultText?.toLowerCase()).toContain("transaction");
    });
});
