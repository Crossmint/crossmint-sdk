import { expect, test } from "@playwright/test";
import { createFireblocksWallet } from "./functions/aa-wallets";
import exp from "constants";

let addressCreated = "";
 test.beforeEach(async ({ page }) => {
    addressCreated = await createFireblocksWallet(page);
}); 

test.describe("AA wallet with Fireblocks signer", () => {
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

    test.only("should allow me to sign and verify a message ", async ({ page }) => {
        const simpleMessage = "Simple test message";
        await page.getByPlaceholder("Message to sign").fill(simpleMessage);
        await page.getByText("Sign Message").click();
        const locatorSign = page.getByTestId('signedMessageInput');
        const patternRegex = /^0x[a-fA-F0-9]+(?:00000000[a-fA-F0-9]+)+$/;
        await expect(locatorSign).toHaveValue(patternRegex, { timeout: 120_000 });
        await page.waitForTimeout(2000); // waits for 2 seconds

        await page.getByPlaceholder("Message to verify").fill(simpleMessage);
        await page.getByPlaceholder("Signature").fill(await locatorSign.inputValue());
        await page.getByTestId("VerifyMessageBtn").click({force: true});
        const locatorVerify = page.getByTestId('verifiedMessageOutput');
        expect(locatorVerify).toHaveValue("Not Verified", { timeout: 20_000 });
    });

    test("should allow me to sign typed data", async ({ page }) => {
        await page.getByRole('button', { name: 'Sign Typed Data' }).click({force: true});
        const locatorSignedData = page.getByTestId('SignedTypedData');
        await expect(locatorSignedData).toHaveValue(/^0x[a-fA-F0-9]{130}$/, { timeout: 30_000 });
    });
});
   
