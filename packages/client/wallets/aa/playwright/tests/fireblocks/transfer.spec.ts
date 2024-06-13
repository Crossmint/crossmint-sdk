import { expect, test } from "@playwright/test";
import { createFireblocksWallet } from "../functions/aa-wallets";

test.describe("AA wallet with Fireblocks signer", () => {
    let addressCreated = "";
    test.beforeEach(async ({ page }) => {
        addressCreated = await createFireblocksWallet(page);
    }); 
    //These tests need to run in two different tests, one for ERC1155 and another for ERC20, currently there is this issue SCW-419
    test("should allow me to mint and transfer ERC1155, ERC20", async ({ page }) => {
        test.setTimeout(240 * 1000);
        await page.getByText("Execute Transfer ERC1155").click();
        const locatorERC1155 = page.getByTestId('executeTransferERC1155HashInput');
        await expect(locatorERC1155).toHaveValue(/^0x[a-fA-F0-9]{64}$/, { timeout: 120_000 });

        await page.getByText("Execute Transfer ERC20").click();
        const locatorERC20 = page.getByTestId('executeTransferERC20HashInput');
        await expect(locatorERC20).toHaveValue(/^0x[a-fA-F0-9]{64}$/, { timeout: 240_000 });
    });

    test.skip("should allow me to mint and transfer ERC721", async ({ page }) => {
        test.setTimeout(240 * 1000);
        await page.getByText("Execute Transfer ERC721").click();
        const locatorERC1155 = page.getByTestId('executeTransferERC721HashInput');
        await expect(locatorERC1155).toHaveValue(/^0x[a-fA-F0-9]{64}$/, { timeout: 120_000 });
    });
});