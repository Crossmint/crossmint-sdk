import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";
import type { Chain, SolanaChain } from "../chains/chains";
import type { WebAuthnP256 } from "ox";
import type { VersionedTransaction } from "@solana/web3.js";

////////////////////////////////////////////////////////////
// Signer configs
////////////////////////////////////////////////////////////
export type EmailSignerConfig = {
    type: "email";
    email?: string;
    onAuthRequired?: (
        sendEmailWithOtp: (email: string) => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: (error: Error) => void
    ) => Promise<void>;
};

export type ExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    // For EVM wallets
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;
    // For Solana wallets
    onSignTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

// Generic EIP1193 Provider interface that should work with different implementations
export interface GenericEIP1193Provider {
    request(args: { method: string; params?: any[] }): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
}

export type ApiKeySignerConfig = { type: "api-key" };

export type BaseSignerConfig = EmailSignerConfig | ExternalWalletSignerConfig | ApiKeySignerConfig;

export type PasskeySignerConfig = {
    type: "passkey";
    name: string;
    id: string;
    onCreatePasskey?: (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;
    onSignWithPasskey?: (message: string) => Promise<string>;
};

export type SignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? BaseSignerConfig
    : PasskeySignerConfig | BaseSignerConfig;

////////////////////////////////////////////////////////////
// Signer base types
////////////////////////////////////////////////////////////
type SignResultMap = {
    email: string;
    "api-key": string;
    "external-wallet": string;
    passkey: {
        signature: {
            r: string;
            s: string;
        };
        metadata: WebAuthnP256.SignMetadata;
    };
};

// Base signer interface
export interface BaseSigner<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    locator(): string;
}

// Email signer interface
export interface IEmailSigner extends BaseSigner<"email"> {
    sign(message: string): Promise<string>;
}

// API key signer interface
export interface IApiKeySigner extends BaseSigner<"api-key"> {
    sign(message: string): Promise<string>;
}

// Passkey signer interface
export interface IPasskeySigner extends BaseSigner<"passkey"> {
    sign(message: string): Promise<SignResultMap["passkey"]>;
}

// External wallet signer base
export interface IExternalWalletSigner extends BaseSigner<"external-wallet"> {
    address: string;
    signMessage?: (message: string) => Promise<string>;
    signTransaction?: (transaction: string) => Promise<string>;
}

// Concrete signer type
export type Signer = IEmailSigner | IApiKeySigner | IPasskeySigner | IExternalWalletSigner;
