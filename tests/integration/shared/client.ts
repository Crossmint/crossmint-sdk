import type { Crossmint } from "@crossmint/common-sdk-base";
import { WalletsApiClient } from "@crossmint/wallets-sdk";

export const PREVIEW_API_KEY = process.env.TESTS_PREVIEW_CROSSMINT_SERVER_API_KEY;
const BASE_URL = process.env.CROSSMINT_BASE_URL || "https://preview.crossmint.com";

export const createIntegrationApiClient = (overrides: Partial<Crossmint> = {}): WalletsApiClient => {
    if (!PREVIEW_API_KEY) {
        throw new Error(
            "TESTS_PREVIEW_CROSSMINT_SERVER_API_KEY is not set. The integration suite needs a real preview API key " +
                "to run — set the secret rather than skip these tests."
        );
    }

    const base = {
        apiKey: PREVIEW_API_KEY,
        overrideBaseUrl: BASE_URL,
        ...overrides,
    };
    const crossmint = {
        ...base,
        setJwt: () => crossmint as Crossmint,
    } as Crossmint;
    return new WalletsApiClient(crossmint);
};
