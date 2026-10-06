import { test, expectAuth } from "../../../shared/fixtures/auth.fixture";
import {
    getWalletAddress,
    getWalletBalance,
    fundWalletWithCrossmintFaucet,
    transferFunds,
    handleSignerConfirmation,
    waitForWalletReady,
} from "../../../shared/utils";
import { TEST_RECIPIENT_WALLET_ADDRESSES, getLegacySmokeWalletEmail } from "../../../shared/constants/globalConstants";

const LEGACY_SMOKE_TEST_CONFIG = {
    provider: "crossmint",
    chain: "evm",
    signer: "email",
    chainId: "base-sepolia",
    alias: undefined,
    emailOverride: getLegacySmokeWalletEmail("email"),
} as const;

test.describe("Signer Limit Regression — legacy over-the-cap wallet (QA-91)", { tag: "@smoke" }, () => {
    test.use({ testConfig: LEGACY_SMOKE_TEST_CONFIG });

    test("transfers funds without hitting the signer cap", async ({ authenticatedPage, testConfig }) => {
        const signerLimitResponses: string[] = [];
        let addedSignerLocator: string | undefined;
        authenticatedPage.on("response", async (response) => {
            const url = response.url();
            if (!/\/signers(\?|$)/.test(url)) {
                return;
            }
            if (response.status() >= 400) {
                const body = await response.text().catch(() => "");
                if (body.includes("SIGNER_LIMIT_EXCEEDED")) {
                    signerLimitResponses.push(body);
                }
                return;
            }
            if (response.request().method() === "POST") {
                const body = await response.json().catch(() => null);
                if (body?.locator) {
                    addedSignerLocator = body.locator;
                }
            }
        });

        try {
            const walletAddress = await getWalletAddress(authenticatedPage);
            const transferAmount = "0.001";

            const balance = await getWalletBalance(authenticatedPage);
            if (parseFloat(balance) < parseFloat(transferAmount)) {
                await fundWalletWithCrossmintFaucet(walletAddress, testConfig.chainId);
                await authenticatedPage.waitForTimeout(2000);
            }

            await transferFunds(
                authenticatedPage,
                TEST_RECIPIENT_WALLET_ADDRESSES.evm,
                transferAmount,
                testConfig.signer,
                testConfig.emailOverride
            );

            expectAuth(
                signerLimitResponses,
                `expected no SIGNER_LIMIT_EXCEEDED response, got: ${signerLimitResponses.join(", ")}`
            ).toHaveLength(0);
        } finally {
            // The transfer above silently registers a new device signer for this fresh browser
            // session. Remove it whenever one was added — even if an earlier step in this test
            // threw — so this wallet's signer count stays flat run over run instead of growing by
            // one every time the suite runs.
            if (addedSignerLocator != null) {
                await authenticatedPage.reload();
                await waitForWalletReady(authenticatedPage);

                const permissionsSection = authenticatedPage.locator("h2:has-text('Add Permission')").first();
                await permissionsSection.scrollIntoViewIfNeeded();

                const removeButton = authenticatedPage.locator(
                    `[data-testid="remove-delegated-signer-button-${addedSignerLocator}"]`
                );
                await removeButton.waitFor({ state: "visible", timeout: 15000 });
                await removeButton.click();

                await handleSignerConfirmation(authenticatedPage, testConfig.signer, testConfig.emailOverride);

                await expectAuth(removeButton).toBeHidden({ timeout: 30000 });
            }
        }
    });
});
