import { test, expectAuth } from "../../../shared/fixtures/auth.fixture";
import { getWalletAddress, getWalletBalance, fundWalletWithCrossmintFaucet, transferFunds } from "../../../shared/utils";
import { TEST_RECIPIENT_WALLET_ADDRESSES, getLegacySmokeWalletEmail } from "../../../shared/constants/globalConstants";

// The wallet behind this identity predates smoke-tests.yml's per-run rotation (see
// getLegacySmokeWalletEmail) and has accumulated well over the 8-signer product cap. It is the
// exact wallet that regressed "transfers funds" with SIGNER_LIMIT_EXCEEDED when PR #2049 removed
// the SDK's client-side pre-check (QA-91): the backend grandfathers wallets already over the cap,
// so re-authenticating into it and transacting must keep working even though it could never be
// created fresh today.
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

        await transferFunds(authenticatedPage, TEST_RECIPIENT_WALLET_ADDRESSES.evm, transferAmount, testConfig.signer);

        expectAuth(
            signerLimitResponses,
            `expected no SIGNER_LIMIT_EXCEEDED response, got: ${signerLimitResponses.join(", ")}`
        ).toHaveLength(0);
    });
});
