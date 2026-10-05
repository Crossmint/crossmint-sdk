import { test, expect } from "@playwright/test";
import type { Crossmint } from "@crossmint/common-sdk-base";
import { WalletsApiClient } from "@crossmint/wallets-sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const SERVER_API_KEY = process.env.TESTS_CROSSMINT_SERVER_API_KEY_SMOKE_TESTS_PROJECT_B || "";

const MAX_SIGNERS_TO_ATTEMPT = 20;

// Fixed so createWallet's idempotent-by-owner lookup keeps matching this exact fixture wallet
// across runs — a random admin signer on every run conflicts with whichever address the wallet
// was actually created with the first time.
const FIXTURE_ADMIN_SIGNER_ADDRESS = "0xC0784e8Ef9Ec09096DCd4D6cdFd5DB3AD9A1Cd86";

function makeApiClient(): WalletsApiClient {
    const crossmint = {
        apiKey: SERVER_API_KEY,
        setJwt: () => crossmint as Crossmint,
    } as Crossmint;
    return new WalletsApiClient(crossmint);
}

function freshExternalWalletAddress(): `0x${string}` {
    return privateKeyToAccount(generatePrivateKey()).address;
}

test.describe("Signer Limit Regression — fresh wallet (QA-91)", { tag: "@smoke" }, () => {
    test.beforeAll(() => {
        if (!SERVER_API_KEY) {
            throw new Error(
                "TESTS_CROSSMINT_SERVER_API_KEY_SMOKE_TESTS_PROJECT_B environment variable must be set to run this test"
            );
        }
    });

    test("is rejected with SIGNER_LIMIT_EXCEEDED once it reaches the signer cap", async () => {
        const apiClient = makeApiClient();

        const createResult = await apiClient.createWallet({
            chainType: "evm",
            type: "smart",
            owner: "userId:qa-91-signer-limit-cap-fixture-v2",
            config: { adminSigner: { type: "external-wallet", address: FIXTURE_ADMIN_SIGNER_ADDRESS } },
        } as Parameters<typeof apiClient.createWallet>[0]);

        if (!("address" in createResult)) {
            throw new Error(`Failed to create test wallet: ${JSON.stringify(createResult)}`);
        }
        const walletAddress = createResult.address;

        let limitResponse: { code?: string; message?: string } | undefined;
        let addedSigners = 0;

        for (let i = 0; i < MAX_SIGNERS_TO_ATTEMPT && limitResponse == null; i++) {
            const response = await apiClient.registerSigner(walletAddress, {
                signer: `external-wallet:${freshExternalWalletAddress()}`,
                chain: "base-sepolia",
                deployImmediately: true,
            });

            if (response && typeof response === "object" && "error" in response && response.error) {
                limitResponse = response as { code?: string; message?: string };
            } else {
                addedSigners++;
            }
        }

        expect(
            limitResponse,
            `expected a SIGNER_LIMIT_EXCEEDED response after ${addedSigners} added signers, within ${MAX_SIGNERS_TO_ATTEMPT} attempts`
        ).toBeDefined();
        expect(limitResponse?.code).toBe("SIGNER_LIMIT_EXCEEDED");
    });
});
