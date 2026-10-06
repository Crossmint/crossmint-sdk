import { test } from "../../../shared/fixtures/auth.fixture";
import { handleSignerConfirmation, waitForWalletReady } from "../../../shared/utils";
import { getLegacySmokeWalletEmail } from "../../../shared/constants/globalConstants";

const LEGACY_SMOKE_TEST_CONFIG = {
    provider: "crossmint",
    chain: "evm",
    signer: "email",
    chainId: "base-sepolia",
    alias: undefined,
    emailOverride: getLegacySmokeWalletEmail("email"),
} as const;

const MAX_CONSECUTIVE_FAILURES = 5;
const RETRY_BACKOFF_MS = 20000;

test.describe(
    "One-time cleanup — purge the QA-91 legacy wallet's leaked delegated signers",
    { tag: "@manual-only" },
    () => {
        test.use({ testConfig: LEGACY_SMOKE_TEST_CONFIG });
        // Each removal can trip the project's request-rate limit (the app refetches every
        // remaining signer's status after each one), so this can take hours at this count.
        test.setTimeout(4 * 60 * 60 * 1000);

        test("removes every delegated signer left behind by the pre-finally-fix cleanup gap", async ({
            authenticatedPage,
            testConfig,
        }) => {
            const permissionsSection = authenticatedPage.locator("h2:has-text('Add Permission')").first();
            await permissionsSection.scrollIntoViewIfNeeded();

            const signerList = authenticatedPage.locator('[data-testid="delegated-signers-list"] li');
            let currentCount = await signerList.count();
            console.log(`Starting delegated signer count: ${currentCount}`);

            let consecutiveFailures = 0;
            while (currentCount > 0) {
                try {
                    const removeButton = authenticatedPage
                        .locator('[data-testid="delegated-signers-list"] li button')
                        .first();
                    await removeButton.waitFor({ state: "visible", timeout: 15000 });
                    await removeButton.click();

                    await handleSignerConfirmation(authenticatedPage, testConfig.signer, testConfig.emailOverride);

                    await authenticatedPage.waitForFunction(
                        (previousCount) =>
                            document.querySelectorAll('[data-testid="delegated-signers-list"] li').length <
                            previousCount,
                        currentCount,
                        { timeout: 60000 }
                    );

                    consecutiveFailures = 0;
                } catch (error) {
                    consecutiveFailures++;
                    console.warn(
                        `Removal attempt failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES} consecutive): ${error}`
                    );
                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                        throw new Error(
                            `Giving up after ${consecutiveFailures} consecutive failed removal attempts; ` +
                                `${currentCount} delegated signers still remain. Re-run this test to resume.`
                        );
                    }
                    await authenticatedPage.waitForTimeout(RETRY_BACKOFF_MS);
                    await authenticatedPage.reload();
                    await waitForWalletReady(authenticatedPage);
                    await permissionsSection.scrollIntoViewIfNeeded();
                }

                currentCount = await signerList.count();
                console.log(`Removed one signer — delegated signer count now: ${currentCount}`);
            }

            console.log("Done: legacy wallet now holds 0 delegated signers");
        });
    }
);
