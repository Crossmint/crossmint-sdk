import { test } from "../../../shared/fixtures/auth.fixture";
import { handleSignerConfirmation } from "../../../shared/utils";
import { getCapFixtureWalletEmail } from "../../../shared/constants/globalConstants";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const FIXTURE_EMAIL = getCapFixtureWalletEmail("email");
const TARGET_DELEGATED_SIGNERS = 15;

const FIXTURE_TEST_CONFIG = {
    provider: "crossmint",
    chain: "evm",
    signer: "email",
    chainId: "base-sepolia",
    alias: undefined,
    emailOverride: FIXTURE_EMAIL,
} as const;

test.describe("One-time setup — seed the QA-91 cap-fixture wallet to 16 signers", { tag: "@manual-only" }, () => {
    test.use({ testConfig: FIXTURE_TEST_CONFIG });

    test("adds delegated signers until the wallet holds 1 admin + 15 delegated", async ({ authenticatedPage }) => {
        const permissionsSection = authenticatedPage.locator("h2:has-text('Add Permission')").first();
        await permissionsSection.scrollIntoViewIfNeeded();

        const signerList = authenticatedPage.locator('[data-testid="delegated-signers-list"] li');
        let currentCount = await signerList.count();
        console.log(`Starting delegated signer count: ${currentCount}`);

        while (currentCount < TARGET_DELEGATED_SIGNERS) {
            const address = privateKeyToAccount(generatePrivateKey()).address;

            const input = authenticatedPage.locator('[data-testid="delegated-signer-input"]');
            await input.fill(address);

            const addButton = authenticatedPage.locator('[data-testid="add-delegated-signer-button"]');
            await addButton.click();

            await handleSignerConfirmation(authenticatedPage, "email", FIXTURE_EMAIL);

            await authenticatedPage.locator(`[data-testid="delegated-signer-item-${currentCount}"]`).waitFor({
                state: "visible",
                timeout: 60000,
            });

            currentCount = await signerList.count();
            console.log(`Added signer for ${address} — delegated signer count now: ${currentCount}`);
        }

        console.log(`Done: wallet now holds 1 admin + ${currentCount} delegated signers`);
    });
});
