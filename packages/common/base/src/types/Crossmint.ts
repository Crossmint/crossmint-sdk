import { validateAPIKey } from "@/apiKey";

export type Crossmint = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
};

export function createCrossmint(config: Crossmint): Crossmint {
    const { apiKey, jwt, overrideBaseUrl } = config;
    const apiKeyValidationResult = validateAPIKey(apiKey);
    if (!apiKeyValidationResult.isValid) {
        throw new Error(apiKeyValidationResult.message);
    }
    return {
        apiKey,
        jwt,
        overrideBaseUrl,
    };
}
