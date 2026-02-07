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
    /** @internal */
    jwt?: string;
    /** @internal */
    overrideBaseUrl?: string;
    /** @internal */
    appId?: string;
    /** @internal */
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
