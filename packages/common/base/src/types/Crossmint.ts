import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";

export type CrossmintConfig = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
    appId?: string;
    extensionId?: string;
};

export type Crossmint = CrossmintConfig & {
    setJwt: (jwt: string) => Crossmint;
};

export function createCrossmint(
    config: CrossmintConfig,
    apiKeyExpectations?: ValidateAPIKeyPrefixExpectations
): Crossmint {
    const { apiKey, jwt, overrideBaseUrl, appId, extensionId } = config;
    const apiKeyValidationResult = validateAPIKey(apiKey, apiKeyExpectations);
    if (!apiKeyValidationResult.isValid) {
        throw new Error(apiKeyValidationResult.message);
    }

    function setJwt(jwt: string) {
        return createCrossmint({ ...config, jwt });
    }

    return {
        apiKey,
        jwt,
        overrideBaseUrl,
        appId,
        extensionId,
        setJwt,
    };
}
