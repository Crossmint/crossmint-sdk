import { expect, test } from "@playwright/test";

const baseURL = process.env.REACT_APP_BASE_URL ?? "/";
const testAccountPrivateKey = process.env.GOOGLE_TEST_ACCOUNT_PRIVATE_KEY as string;

test.beforeEach("Clear all browser data and set the test account private key in localstorage", async ({ context }) => {
    // clear cookies to ensure we are not logged in.
    await context.clearCookies();
    // set our test google account's private key in local storage.
    await context.addInitScript({
        content: `localStorage.setItem("testAccountPrivateKey", "${testAccountPrivateKey}");`,
    });
});

test.describe("Signing in, creating wallet, and asserting nft works as expected", () => {
    test("login with our test google account", async ({ page, context }) => {
        await page.goto(baseURL);

        expect(page.getByText("Crossmint AA Wallet Demo"));
        await page.getByText("Try it!").click();
        // wait for popup window to show up loaded.
        const popup = await page.waitForEvent("popup");
        await popup.waitForLoadState("domcontentloaded");
        await popup.waitForLoadState("load");

        await popup.getByLabel("Email or phone").fill(process.env.GOOGLE_TEST_EMAIL as string);

        // Wait for the "Next" button to be visible and then click it.
        const nextButton = popup.getByRole("button", { name: "Next" });
        await nextButton.waitFor({ state: "visible" });
        await nextButton.click();

        await popup.getByLabel("Enter your password").fill(process.env.GOOGLE_TEST_PASSWORD as string);

        // Wait for the "Next" button to be visible and then click it.
        await nextButton.waitFor({ state: "visible" });
        await nextButton.click();

        // Wait for the google sign in and wallet creation to complete (10 second timeout should be enough).
        await page.waitForURL("/mint", { timeout: 10000 });
        await expect(page.getByText("Login Successfully")).toBeVisible();

        await page.getByRole("heading", { name: "Wallet" }).click();
        await page.waitForURL("/wallet", { timeout: 1000 });
        await expect(page.getByText("Assets")).toBeVisible();

        // Get the current number of assets in wallet
        const itemsText = await page.getByText("Items").innerText();
        const numberOfAssetsInWallet = parseInt(itemsText.split(" ")[0], 10);
        console.log(`Number of assets in wallet: ${numberOfAssetsInWallet}`);

        // Go back to mint page and mint a new NFT
        await page.getByRole("heading", { name: "Mint", exact: true }).click();
        await page.waitForURL("/mint", { timeout: 1000 });
        await page.getByRole("button", { name: "Mint" }).click();

        // Wait for the minting process to complete, a redirect back to wallet page will happen.
        await page.waitForURL("/wallet", { timeout: 20000 });
        await expect(page.getByText("NFT Minted Successfully")).toBeVisible();
        await expect(page.getByText("Assets")).toBeVisible();

        // hard refresh page to get the updated number of assets in wallet
        // todo: could be improved but is up to front end to handle this better.
        // reload the page twice to ensure the nft is minted and added to wallet.
        const maxRetries = 5;
        let retries = 0;
        let assetsUpdated = false;

        while (retries < maxRetries && !assetsUpdated) {
            await page.reload({ waitUntil: "networkidle" });
            await page.waitForTimeout(5000); // Wait for 5 seconds to ensure the page is fully loaded
            const updatedAssets = await page.$(`text=${numberOfAssetsInWallet + 1} Items`);
            if (updatedAssets) {
                assetsUpdated = true;
            } else {
                retries++;
                if (retries < maxRetries) {
                    console.log(`Assets not updated, retrying... (${retries}/${maxRetries})`);
                } else {
                    console.log("Assets not updated after maximum retries.");
                }
            }
        }

        expect(assetsUpdated).toBe(true);
    });
});
