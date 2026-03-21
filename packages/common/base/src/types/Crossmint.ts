import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";

export type CrossmintConfig = {
    /** Your Crossmint client-side API key. */
    apiKey: string;
    /** JWT token for authentication. */
    jwt?: string;
    /** Override the base API URL. */
    overrideBaseUrl?: string;
    /** Application identifier, sent as `x-app-identifier` header. */
    appId?: string;
    /** Extension identifier, sent as `x-extension-id` header. */
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
