import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";

export type User = {
    email?: string;
    jwt: string;
};

export type CrossmintConfig = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
    appId?: string;
    user?: User;
};

export type Crossmint = CrossmintConfig & {
    experimental_setAuth: (user: User) => Crossmint;
    setJwt: (jwt: string) => Crossmint;
};

export function createCrossmint(
    config: CrossmintConfig,
    apiKeyExpectations?: ValidateAPIKeyPrefixExpectations
): Crossmint {
    const { apiKey, jwt, overrideBaseUrl, appId, user } = config;
    const apiKeyValidationResult = validateAPIKey(apiKey, apiKeyExpectations);
    if (!apiKeyValidationResult.isValid) {
        throw new Error(apiKeyValidationResult.message);
    }

    function experimental_setAuth(user: User) {
        return createCrossmint({ ...config, jwt: user.jwt, user });
    }

    function setJwt(jwt: string) {
        return createCrossmint({ ...config, jwt });
    }

    return {
        apiKey,
        jwt,
        overrideBaseUrl,
        appId,
        user,
        experimental_setAuth,
        setJwt,
    };
}
