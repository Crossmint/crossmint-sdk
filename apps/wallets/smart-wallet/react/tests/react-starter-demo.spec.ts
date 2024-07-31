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

test.describe("End-to-End Flow: Signing in, creating wallet, and minting NFT", () => {
    test("Login with Google, create smart wallet, and mint NFT", async ({ page }) => {
        await page.goto(baseURL);

        expect(page.getByText("Crossmint AA Wallet Demo"));
        await page.waitForSelector('text="Try it!"', { state: "visible" });
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

        // Go back to mint page and mint a new NFT
        await page.getByRole("heading", { name: "Mint", exact: true }).click();
        await page.waitForURL("/mint", { timeout: 1000 });
        await page.getByRole("button", { name: "Mint" }).click();

        // Wait for the minting process to complete, a redirect back to wallet page will happen.
        await page.waitForURL("/wallet", { timeout: 35000 });
        await expect(page.getByText("NFT Minted Successfully")).toBeVisible();
    });
});
