import { expect, test } from "@playwright/test";
import { getWallet } from "./functions/aa-wallets";

test.beforeEach(async ({ page }) => {
    await getWallet(page);
});

test.describe("AA wallet", () => {
    test("should allow me to get a wallet", async ({ page }) => {
        const locator = page.getByTestId('createdOrGotWallet');
        await expect(locator).toHaveValue("0xbA23099994403e1e1A4Fe569ab2A4B06f59d047d", { timeout: 10_000 });
    });

    test("should allow me to sign a message", async ({ page }) => {
        await page.getByText("Sign Message").click();
        const locatorSign = page.getByTestId('signedMessageInput');
        await expect(locatorSign).toHaveValue("0x7581e3edc09b642a46a00befdba6e0bae61fff4f78381eab77aec3261c48d031637cf8bb4ac209199a64bdaa46d52f0f742aa5b7e33eedd934e909c21b53fd0c1b", { timeout: 20_000 });
    });

    test("should allow me to send transaction", async ({ page }) => {
        await page.getByRole('button', { name: 'Send transaction' }).click({force: true});
        const locatorSend = page.getByTestId('sendTransactionTxHashInput');
        await expect(locatorSend).toHaveValue(/^0x[a-fA-F0-9]{64}$/, { timeout: 20_000 });
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
});
   
