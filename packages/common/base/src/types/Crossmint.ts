import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";
import type {
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
} from "./signers";

export type CustomAuth = {
    email?: string;
    phone?: string;
    jwt?: string;
    externalWalletSigner?:
        | EvmExternalWalletSignerConfig
        | SolanaExternalWalletSignerConfig
        | StellarExternalWalletSignerConfig;
};

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
    /** @internal */
    experimental_customAuth?: CustomAuth;
};

export type Crossmint = CrossmintConfig & {
    experimental_setCustomAuth: (customAuth: CustomAuth) => Crossmint;
    setJwt: (jwt: string) => Crossmint;
};

export function createCrossmint(
    config: CrossmintConfig,
    apiKeyExpectations?: ValidateAPIKeyPrefixExpectations
): Crossmint {
    const { apiKey, jwt, overrideBaseUrl, appId, extensionId, experimental_customAuth } = config;
    const apiKeyValidationResult = validateAPIKey(apiKey, apiKeyExpectations);
    if (!apiKeyValidationResult.isValid) {
        throw new Error(apiKeyValidationResult.message);
    }

    function experimental_setCustomAuth(customAuth: CustomAuth) {
        return createCrossmint({ ...config, jwt: customAuth.jwt, experimental_customAuth: customAuth });
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
        experimental_customAuth,
        experimental_setCustomAuth,
        setJwt,
    };
}
