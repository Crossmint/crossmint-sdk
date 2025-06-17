import { type ValidateAPIKeyPrefixExpectations, validateAPIKey } from "@/apiKey";
import type { VersionedTransaction } from "@solana/web3.js";
import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";

export type BaseExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
};

// Generic EIP1193 Provider interface that should work with different implementations
export interface GenericEIP1193Provider {
    request(args: { method: string; params?: any[] }): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
}

export type EvmExternalWalletSignerConfig = BaseExternalWalletSignerConfig & {
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;
};

export type SolanaExternalWalletSignerConfig = BaseExternalWalletSignerConfig & {
    onSignTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

export type CustomAuth = {
    email?: string;
    jwt?: string;
    externalWalletSigner?: EvmExternalWalletSignerConfig | SolanaExternalWalletSignerConfig;
};

export type CrossmintConfig = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
    appId?: string;
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
    const { apiKey, jwt, overrideBaseUrl, appId, experimental_customAuth } = config;
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
        experimental_customAuth,
        experimental_setCustomAuth,
        setJwt,
    };
}
