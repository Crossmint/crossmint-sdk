import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";

export type Crossmint = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
};

export function createCrossmint(config: Crossmint, apiKeyExpectations?: ValidateAPIKeyPrefixExpectations): Crossmint {
    const { apiKey, jwt, overrideBaseUrl } = config;
    const apiKeyValidationResult = validateAPIKey(apiKey, apiKeyExpectations);
    if (!apiKeyValidationResult.isValid) {
        throw new Error(apiKeyValidationResult.message);
    }
    return {
        apiKey,
        jwt,
        overrideBaseUrl,
    };
}
