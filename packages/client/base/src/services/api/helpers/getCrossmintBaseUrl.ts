import { validateAPIKey } from "@crossmint/common-sdk-base";

import { CROSSMINT_DEV_URL, CROSSMINT_PROD_URL, CROSSMINT_STG_URL } from "../../../consts";

const urlMap = {
    development: CROSSMINT_DEV_URL,
    staging: CROSSMINT_STG_URL,
    production: CROSSMINT_PROD_URL,
};

export function getCrossmintBaseUrl(apiKey: string) {
    const result = validateAPIKey(apiKey);
    if (!result.isValid) {
        throw new Error("Crossmint API key is invalid");
    }
    const url = urlMap[result.environment];
    if (!url) {
        throw new Error(`URL not found for environment: ${result.environment}`);
    }
    return url;
}
