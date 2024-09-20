import { CROSSMINT_DEV_URL, CROSSMINT_PROD_URL, CROSSMINT_STG_URL } from "../consts";
import type { APIKeyEnvironmentPrefix } from "../types";
import { validateAPIKey } from "../validateAPIKey";

const urlMap: Record<APIKeyEnvironmentPrefix, string> = {
    development: CROSSMINT_DEV_URL,
    staging: CROSSMINT_STG_URL,
    production: CROSSMINT_PROD_URL,
};

export function validateApiKeyAndGetCrossmintBaseUrl(apiKey: string) {
    const result = validateAPIKey(apiKey);
    if (!result.isValid) {
        throw new Error("Crossmint API key is invalid");
    }
    return urlMap[result.environment];
}
