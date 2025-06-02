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
    setUser: (user: User) => Crossmint;
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

    function setUser(user: User) {
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
        setUser,
        setJwt,
    };
}
