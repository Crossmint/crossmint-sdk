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
    onSignTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
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
    name?: string;
    id?: string;
    onCreatePasskey?: (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;
    onSignWithPasskey?: (message: string) => Promise<PasskeySignResult>;
};

export type SimpleSignResult = {
    signature: string;
};

export type PasskeySignResult = {
    signature: {
        r: string;
        s: string;
    };
    metadata: WebAuthnP256.SignMetadata;
};

export type SignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? BaseSignerConfig
    : PasskeySignerConfig | BaseSignerConfig;

////////////////////////////////////////////////////////////
// Signer base types
////////////////////////////////////////////////////////////
type SignResultMap = {
    email: SimpleSignResult;
    "api-key": SimpleSignResult;
    "external-wallet": SimpleSignResult;
    passkey: PasskeySignResult;
};

export interface Signer<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    locator(): string;
    signMessage(message: string): Promise<SignResultMap[T]>;
    signTransaction(transaction: string): Promise<SignResultMap[T]>;
}
