import { Page, expect } from "@playwright/test";

export async function getWallet(page: Page) {
    await page.goto("/");
    await page.getByPlaceholder("Email for ethers").fill("begona+testgetwallet@paella.dev");
    await page.getByPlaceholder("Private key").fill("274c683c7aaa921afb22b49ddaf3395d9f61f72245fd3e1c4885b39caff12ec0");
    await page.getByRole("button", { name: "Create wallet for Ethers" }).click();
    const locator = page.getByTestId("createdOrGotWalletEthers");
    await expect(locator).toHaveValue("0xbA23099994403e1e1A4Fe569ab2A4B06f59d047d", { timeout: 10_000 });
}

export async function createFireblocksWallet(page: Page) {
    await page.goto("/");
    const email = "begona" + Date.now() + "@email.com";
    await page.getByPlaceholder("Email for Fireblocks").fill(email);
    await page.getByRole("button", { name: "Create Fireblocks wallet" }).click();
    const address = page.getByTestId("createdOrGotFireblocksWallet");
    await expect(address).toHaveValue(/^0x[a-fA-F0-9]{40}$/, { timeout: 240_000 });
    const addressCreated = await address.inputValue();

    console.log("addressCreated: ", addressCreated);
    return addressCreated;
}

export async function getFireblocksWallet(page: Page, email: string) {
    await page.goto("/");
    await page.getByPlaceholder("Email for Fireblocks").fill(email);
    await page.getByRole("button", { name: "Create Fireblocks wallet" }).click();
    const address = page.getByTestId("createdOrGotFireblocksWallet");
    await expect(address).toHaveValue(/^0x[a-fA-F0-9]{40}$/, { timeout: 240_000 });
    const addressValue = await address.inputValue();
    console.log("addressValue: ", addressValue);
    return addressValue;
}
