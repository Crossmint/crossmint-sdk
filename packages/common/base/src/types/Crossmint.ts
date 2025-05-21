import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";

export type User = {
    email: string;
};

export type Crossmint = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
    appId?: string;
    user?: User;
};

export function createCrossmint(config: Crossmint, apiKeyExpectations?: ValidateAPIKeyPrefixExpectations): Crossmint {
    const { apiKey, jwt, overrideBaseUrl, appId, user } = config;
    const apiKeyValidationResult = validateAPIKey(apiKey, apiKeyExpectations);
    if (!apiKeyValidationResult.isValid) {
        throw new Error(apiKeyValidationResult.message);
    }
    return {
        apiKey,
        jwt,
        overrideBaseUrl,
        appId,
        user,
    };
}
