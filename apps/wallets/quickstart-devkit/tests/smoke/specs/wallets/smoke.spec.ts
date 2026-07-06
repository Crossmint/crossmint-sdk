import { test, expectAuth } from "../../../shared/fixtures/auth.fixture";
import {
    getWalletAddress,
    getWalletBalance,
    getWalletBalances,
    getWalletActivity,
    transferFunds,
    createPreparedTransaction,
    approveTransactionById,
    fundWalletWithCrossmintFaucet,
    fundWalletWithSolAirdrop,
} from "../../../shared/utils";
import { TEST_RECIPIENT_WALLET_ADDRESSES } from "../../../shared/constants/globalConstants";

const SMOKE_TEST_CONFIG = {
    provider: "crossmint",
    chain: "evm",
    signer: "email",
    chainId: "base-sepolia",
    alias: undefined,
} as const;

test.describe("Wallet Smoke", { tag: "@smoke" }, () => {
    test.describe.configure({ mode: "serial" });
    test.use({ testConfig: SMOKE_TEST_CONFIG });

    test("authenticates and creates wallet", async ({ authenticatedPage }, testInfo) => {
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

    test("fetches wallet balances via SDK", async ({ authenticatedPage }) => {
        const balances = await getWalletBalances(authenticatedPage);

        expectAuth(balances).toBeTruthy();
        expectAuth(typeof balances).toBe("object");
        expectAuth(balances.nativeToken).toBeTruthy();
        expectAuth(balances.usdxm).toBeTruthy();
        expectAuth(Array.isArray(balances.tokens)).toBe(true);

        expectAuth(balances.nativeToken.amount).toBeTruthy();
        expectAuth(balances.nativeToken.symbol).toBeTruthy();
        expectAuth(balances.nativeToken.symbol.toLowerCase()).toBe("eth");
        const nativeAmount = parseFloat(balances.nativeToken.amount);
        expectAuth(Number.isFinite(nativeAmount)).toBe(true);
        expectAuth(nativeAmount).toBeGreaterThanOrEqual(0);

        expectAuth(balances.usdxm.amount).toBeTruthy();
        expectAuth(balances.usdxm.symbol.toLowerCase()).toBe("usdxm");
        const usdxmAmount = parseFloat(balances.usdxm.amount);
        expectAuth(Number.isFinite(usdxmAmount)).toBe(true);
        expectAuth(usdxmAmount).toBeGreaterThanOrEqual(0);

        expectAuth(/^\d+(\.\d+)?$/.test(balances.nativeToken.amount)).toBe(true);
        expectAuth(/^\d+(\.\d+)?$/.test(balances.usdxm.amount)).toBe(true);
    });

    test("fetches wallet activity", async ({ authenticatedPage }) => {
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

    test("transfers funds", async ({ authenticatedPage, testConfig }) => {
        const walletAddress = await getWalletAddress(authenticatedPage);
        // Transfer the minimum practical amount so the reused wallet's funds
        // last across many runs without needing the faucet.
        const transferAmount = "0.01";

        // Only hit the faucet when the reused wallet doesn't have enough USDXM
        const balance = await getWalletBalance(authenticatedPage);
        const balanceNum = parseFloat(balance);
        if (balanceNum < parseFloat(transferAmount)) {
            await fundWalletWithCrossmintFaucet(walletAddress, testConfig.chainId);
            // Wait a moment for the funding to complete
            await authenticatedPage.waitForTimeout(2000);
        } else {
            console.log(`✅ Wallet already holds ${balanceNum} USDXM, skipping faucet`);
        }

        // Solana token transfers require native SOL for transaction fees.
        // The Crossmint faucet only funds USDXM; without SOL the tx is
        // submitted but never confirms (silent on-chain failure).
        // Skips internally when the reused wallet already holds SOL.
        if (testConfig.chain === "solana") {
            await fundWalletWithSolAirdrop(walletAddress);
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

        await transferFunds(authenticatedPage, recipientAddress, transferAmount, testConfig.signer);

        console.log(
            `✅ ${testConfig.provider}/${testConfig.chain}/${testConfig.signer} transfer completed successfully!`
        );
    });

    test("creates and approves a prepared transaction", async ({ authenticatedPage, testConfig }) => {
        const recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.evm;
        // Transfer the minimum practical amount so the reused wallet's funds
        // last across many runs without needing the faucet.
        const transferAmount = "0.01";
        const walletAddress = await getWalletAddress(authenticatedPage);

        expectAuth(recipientAddress).toBeTruthy();
        expectAuth(recipientAddress.startsWith("0x")).toBe(true);
        expectAuth(recipientAddress.length).toBe(42);
        expectAuth(/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)).toBe(true);

        // Only hit the faucet when the reused wallet doesn't have enough USDXM
        const initialBalance = await getWalletBalance(authenticatedPage);
        const initialBalanceNum = parseFloat(initialBalance);
        if (initialBalanceNum < parseFloat(transferAmount)) {
            await fundWalletWithCrossmintFaucet(walletAddress, testConfig.chainId, 10);
            // Wait a moment for the funding to complete
            await authenticatedPage.waitForTimeout(2000);
        } else {
            console.log(`✅ Wallet already holds ${initialBalanceNum} USDXM, skipping faucet`);
        }

        //check approval test heading
        const approvalTestHeading = authenticatedPage.locator("text=/Approval Method Test/i").first();
        await approvalTestHeading.scrollIntoViewIfNeeded();
        await expectAuth(approvalTestHeading).toBeVisible();

        const transactionId = await createPreparedTransaction(
            authenticatedPage,
            recipientAddress,
            transferAmount,
            "usdxm",
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
