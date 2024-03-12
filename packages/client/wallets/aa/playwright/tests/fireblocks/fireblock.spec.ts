import { expect, test } from "@playwright/test";
import { createFireblocksWallet, getFireblocksWallet } from "../functions/aa-wallets";

test.describe("AA wallet with Fireblocks signer", () => {
    let addressCreated = "";
    test.beforeEach(async ({ page }) => {
        addressCreated = await createFireblocksWallet(page);
    }); 

    test("should allow me to create a wallet", async ({ page }) => {
        const locator = page.getByTestId('createdOrGotFireblocksWallet');
        await expect(locator).toHaveValue(/^0x[a-fA-F0-9]{40}$/);
    });

    test("should allow me to get a wallet for the same email", async ({ page }) => {
        await page.getByRole('button', { name: 'Create Fireblocks wallet' }).click();
         const address = page.getByTestId('createdOrGotFireblocksWallet');
        console.log("addressCreated: ", addressCreated);
        await address.inputValue();
        console.log("address.inputValue(): ", address.inputValue());    
        await expect(address).toHaveValue(addressCreated, { timeout: 60_000 });
    });

    test("should allow me to sign typed data", async ({ page }) => {
        await page.getByRole('button', { name: 'Sign Typed Data' }).click({force: true});
        const locatorSignedData = page.getByTestId('SignTypedDataInput');
        await expect(locatorSignedData).toHaveValue(/^0x[a-fA-F0-9]{130}$/, { timeout: 30_000 });
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
            setTimeout(() => reject(new Error('Console message not found within the timeout period')), 30_000); 
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

    test("should allow me to check localStorage and purge", async ({ page }) => {
        await page.getByTestId("CheckLocalStorageBtn").click();
        const locatorLocalStorageText =  page.getByTestId('LocalStorageData');
        console.log("locatorLocalStorageText: ", locatorLocalStorageText);
        await locatorLocalStorageText.textContent();
        console.log("locatorLocalStorageText.inputValue(): ", locatorLocalStorageText.textContent());
        await expect(locatorLocalStorageText).toHaveText("Data found in LocalStorage starting with \"NCW-\".", { timeout: 5_000 });

        await page.getByTestId("PurgeLocalDataBtn").click();
        await page.getByTestId("CheckLocalStorageBtn").click();
        const locatorLocalStorageTextAfterPurge1 = page.getByTestId('LocalStorageData');
        await expect(locatorLocalStorageTextAfterPurge1).toHaveText("No data found in LocalStorage starting with \"NCW-\".", { timeout: 5_000 });


        let newAddressCreated = "";
        newAddressCreated = await createFireblocksWallet(page);
        await page.getByTestId("CheckLocalStorageBtn").click();
        const locatorLocalStorageText2 =  page.getByTestId('LocalStorageData');
        console.log("locatorLocalStorageText: ", locatorLocalStorageText);
        await locatorLocalStorageText2.textContent();
        console.log("locatorLocalStorageText2.inputValue(): ", locatorLocalStorageText2.textContent());
        await expect(locatorLocalStorageText).toHaveText("Data found in LocalStorage starting with \"NCW-\".", { timeout: 5_000 });

        await page.getByTestId("PurgeLocalDataBtn").click();
        await page.getByTestId("CheckLocalStorageBtn").click();
        const locatorLocalStorageTextAfterPurge = page.getByTestId('LocalStorageData');
        await expect(locatorLocalStorageTextAfterPurge).toHaveText("No data found in LocalStorage starting with \"NCW-\".", { timeout: 5_000 });

    });

    test("should allow me to fetch NFTs", async ({ page }) => {
        await page.getByTestId("getNFTsbtn").click();
        const locatorNFT = await page.getByTestId('getNFTsContent');
        await expect(locatorNFT).toContainText("[]", { timeout: 30_000 });
    });
});

test.describe("AA wallet with Fireblocks signer", () => {
    test("should allow me to sign and verify a message ", async ({ page }) => {
        const email = "begona+testgetfireblockswallet@paella.dev";
        await getFireblocksWallet(page,email)
        const simpleMessage = "Simple test mesasge";
        const signedMessage = "0x0000000000000000000000005de4839a76cf55d0c90e2061ef4386d962e15ae3000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000124296601cd0000000000000000000000000da6a956b9488ed4dd761e59f52fdc6c8068e6b5000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084d1f57894000000000000000000000000d9ab5096a832b9ce79914329daee236f8eea039000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000014Ce195f75FB9aEEF8633D9d3294f1d77e8732A19400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041bfba05f1e91f8ca9e5a346ece73019d977b56461614f95ad0dd23778520da3d84b5956b42bcb928fc3820285c534576c3fe575369f54107819b4bc8f9c9a30c81b000000000000000000000000000000000000000000000000000000000000006492649264926492649264926492649264926492649264926492649264926492"
        await page.getByPlaceholder("Message to verify").fill(simpleMessage);
        await page.getByPlaceholder("Signature").fill(signedMessage);
        await page.getByTestId("VerifyMessageBtn").click();
        const locatorVerify = page.getByTestId('VerifyMessageInput');
        expect(locatorVerify).toHaveValue("Verified", { timeout: 20_000 });
    });
});
   
   
