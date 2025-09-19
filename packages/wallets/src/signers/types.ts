import type { WebAuthnP256 } from "ox";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain, StellarChain } from "../chains/chains";
import type { VersionedTransaction } from "@solana/web3.js";
import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";

////////////////////////////////////////////////////////////
// External wallet signer config
////////////////////////////////////////////////////////////
export type BaseExternalWalletSignerConfig = {
    type: "external-wallet";
    address?: string;
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
    onSignTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

export type StellarExternalWalletSignerConfig = BaseExternalWalletSignerConfig & {
    onSignStellarTransaction?: (transaction: string) => Promise<string>;
};

////////////////////////////////////////////////////////////
// Signer configs
////////////////////////////////////////////////////////////
export class AuthRejectedError extends Error {
    constructor() {
        super("Authentication was rejected by the user");
        this.name = "AuthRejectedError";
    }
}

export type EmailSignerConfig = {
    type: "email";
    // Optional to support createOnLogin with Crossmint Auth
    email?: string;
    onAuthRequired?: (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => Promise<void>;
};

export type PhoneSignerConfig = {
    type: "phone";
    // Optional to support createOnLogin with Crossmint Auth
    phone?: string;
    onAuthRequired?: (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => Promise<void>;
};

export type NonCustodialSignerType = PhoneSignerConfig["type"] | EmailSignerConfig["type"];

export type ExternalWalletSignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? SolanaExternalWalletSignerConfig
    : C extends StellarChain
      ? StellarExternalWalletSignerConfig
      : EvmExternalWalletSignerConfig;

export type ApiKeySignerConfig = { type: "api-key" };

export type BaseSignerConfig<C extends Chain> = ExternalWalletSignerConfigForChain<C> | ApiKeySignerConfig;

export type PasskeySignerConfig = {
    type: "passkey";
    name?: string;
    onCreatePasskey?: (name: string) => Promise<{ id: string; publicKey: { x: string; y: string } }>;
    onSignWithPasskey?: (message: string) => Promise<PasskeySignResult>;
};

////////////////////////////////////////////////////////////
// Internal signer config
////////////////////////////////////////////////////////////
type BaseInternalSignerConfig = {
    locator: string;
    address: string;
    crossmint: Crossmint;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export type EmailInternalSignerConfig = EmailSignerConfig & BaseInternalSignerConfig;

export type PhoneInternalSignerConfig = PhoneSignerConfig & BaseInternalSignerConfig;

export type PasskeyInternalSignerConfig = PasskeySignerConfig & {
    locator: string;
    id: string;
};

export type ApiKeyInternalSignerConfig = ApiKeySignerConfig & {
    locator: string;
    address: string;
};

export type ExternalWalletInternalSignerConfig<C extends Chain> = ExternalWalletSignerConfigForChain<C> & {
    locator: string;
};

export type InternalSignerConfig<C extends Chain> =
    | EmailInternalSignerConfig
    | PhoneInternalSignerConfig
    | PasskeyInternalSignerConfig
    | ApiKeyInternalSignerConfig
    | ExternalWalletInternalSignerConfig<C>;

////////////////////////////////////////////////////////////
// Signers
////////////////////////////////////////////////////////////
export type BaseSignResult = {
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
    ? EmailSignerConfig | PhoneSignerConfig | BaseSignerConfig<C>
    : C extends StellarChain
      ? EmailSignerConfig | PhoneSignerConfig | BaseSignerConfig<C>
      : EmailSignerConfig | PhoneSignerConfig | PasskeySignerConfig | BaseSignerConfig<C>;

////////////////////////////////////////////////////////////
// Signer base types
////////////////////////////////////////////////////////////
type SignResultMap = {
    email: BaseSignResult;
    phone: BaseSignResult;
    "api-key": BaseSignResult;
    "external-wallet": BaseSignResult;
    passkey: PasskeySignResult;
};

export interface Signer<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    locator(): string;
    address?(): string;
    signMessage(message: string): Promise<SignResultMap[T]>;
    signTransaction(transaction: string): Promise<SignResultMap[T]>;
    // Identifier properties for each signer type
    email?: string; // for email signers
    phone?: string; // for phone signers
}
