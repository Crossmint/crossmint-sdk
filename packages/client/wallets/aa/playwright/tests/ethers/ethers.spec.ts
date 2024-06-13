import { expect, test } from "@playwright/test";
import { getWallet } from "../functions/aa-wallets";

test.describe("AA wallet", () => {
    test.beforeEach(async ({ page }) => {
        await getWallet(page);
    });

    test("should allow me to get a wallet", async ({ page }) => {
        const locator = page.getByTestId('createdOrGotWalletEthers');
        await expect(locator).toHaveValue("0xbA23099994403e1e1A4Fe569ab2A4B06f59d047d", { timeout: 10_000 });
    });

    test("should allow me to sign a message", async ({ page }) => {
        const simpleMessage = "Simple test message";
        await page.getByPlaceholder("Message to sign").fill(simpleMessage);
        await page.getByText("Sign Message").click();
        const locatorSign = page.getByTestId('signedMessageInput');
        await expect(locatorSign).toHaveValue("0x7e3bf41cade8bb138beb7a04930d14eaa6f2b41b76dcc36ea994bb907c86c85f24680a3860b44299615b38437413830a54c8bad9ec51f192086e8fea0d0167a21c", { timeout: 20_000 });
    });

    test("should allow me to send transaction", async ({ page }) => {
        await page.getByRole('button', { name: 'Send transaction' }).click({force: true});
        const locatorSend = page.getByTestId('sendTransactionTxHashInput');
        await expect(locatorSend).toHaveValue(/^0x[a-fA-F0-9]{64}$/, { timeout: 60_000 });
    });

    test("should allow me to killswitch", async ({ page }) => {
        await page.getByText("KillSwitch").click();
        const waitForConsoleMessage = new Promise((resolve, reject) => {
            page.on('console', message => {
                console.log(`Console message: ${message.type()}: ${message.text()}`);
                if (message.text().includes('Custodian for KS done - Check DB')) {
                    resolve(true);
                }
            });
            setTimeout(() => reject(new Error('Console message not found within the timeout period')), 20_000); 
        });
        await expect(waitForConsoleMessage).resolves.toBe(true);
    });
    test("should allow me to transfer", async ({ page }) => {
        await page.getByText("Tokens").click();
        const waitForConsoleMessage = new Promise((resolve, reject) => {
            page.on('console', message => {
                console.log(`Console message: ${message.type()}: ${message.text()}`);
                if (message.text().includes('Custodian for Transfer done - Check DB')) {
                    resolve(true);
                }
            });
            setTimeout(() => reject(new Error('Console message not found within the timeout period')), 20_000); 
        });
        await expect(waitForConsoleMessage).resolves.toBe(true);
    });

    test("should allow me to fetch NFTs", async ({ page }) => {
        await page.getByTestId("getNFTsbtn").click();
        const locatorNFT = await page.getByTestId('getNFTsContent');
        await expect(locatorNFT).toContainText("chain", { timeout: 30_000 });
    });
});