import { test, expectAuth } from "../../../shared/fixtures/auth.fixture";
import {
    getWalletAddress,
    getWalletBalance,
    fundWalletWithCrossmintFaucet,
    transferFunds,
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
        authenticatedPage.on("response", async (response) => {
            if (!/\/signers(\?|$)/.test(response.url()) || response.status() < 400) {
                return;
            }
            const body = await response.text().catch(() => "");
            if (body.includes("SIGNER_LIMIT_EXCEEDED")) {
                signerLimitResponses.push(body);
            }
        });

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
    });
});
