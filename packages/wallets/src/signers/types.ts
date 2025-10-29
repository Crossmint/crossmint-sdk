import type { WebAuthnP256 } from "ox";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type {
    Crossmint,
    EVM256KeypairSignerConfig,
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
} from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain, StellarChain } from "../chains/chains";

export type {
    EVM256KeypairSignerConfig,
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
    GenericEIP1193Provider,
} from "@crossmint/common-sdk-base";

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
    email?: string;
    shadowSigner?: {
        enabled: boolean;
    };
    onAuthRequired?: (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => Promise<void>;
};

export type PhoneSignerConfig = {
    type: "phone";
    phone?: string;
    shadowSigner?: {
        enabled: boolean;
    };
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

export type BaseSignerConfig<C extends Chain> =
    | ExternalWalletSignerConfigForChain<C>
    | ApiKeySignerConfig
    | (C extends SolanaChain | StellarChain ? never : EVM256KeypairSignerConfig);

export type PasskeySignerConfig = {
    type: "passkey";
    name?: string;
    id?: string;
    locator?: string;
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

export type EVM256KeypairInternalSignerConfig = EVM256KeypairSignerConfig & {
    locator: string;
    onSignTransaction: (publicKeyBase64: string, data: Uint8Array) => Promise<Uint8Array>;
};

export type InternalSignerConfig<C extends Chain> =
    | EmailInternalSignerConfig
    | PhoneInternalSignerConfig
    | PasskeyInternalSignerConfig
    | ApiKeyInternalSignerConfig
    | ExternalWalletInternalSignerConfig<C>
    | EVM256KeypairInternalSignerConfig;

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
    "evm-p256-keypair": BaseSignResult;
    passkey: PasskeySignResult;
};

export interface Signer<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    locator(): string;
    address?(): string;
    signMessage(message: string): Promise<SignResultMap[T]>;
    signTransaction(transaction: string): Promise<SignResultMap[T]>;
}
