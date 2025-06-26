import type { WebAuthnP256 } from "ox";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type {
    Crossmint,
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
} from "@crossmint/common-sdk-base";
import type { Chain, SolanaChain } from "../chains/chains";

export type {
    EvmExternalWalletSignerConfig,
    SolanaExternalWalletSignerConfig,
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
    onAuthRequired?: (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => Promise<void>;
};

export type ExternalWalletSignerConfigForChain<C extends Chain> = C extends SolanaChain
    ? SolanaExternalWalletSignerConfig
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
export type EmailInternalSignerConfig = EmailSignerConfig & {
    signerAddress: string;
    crossmint: Crossmint;
    _handshakeParent?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
};

export type PasskeyInternalSignerConfig = PasskeySignerConfig & {
    id: string;
};

export type ApiKeyInternalSignerConfig = ApiKeySignerConfig & {
    address: string;
};

export type ExternalWalletInternalSignerConfig<C extends Chain> = ExternalWalletSignerConfigForChain<C>;

export type InternalSignerConfig<C extends Chain> =
    | EmailInternalSignerConfig
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
    ? EmailSignerConfig | BaseSignerConfig<C>
    : EmailSignerConfig | PasskeySignerConfig | BaseSignerConfig<C>;

////////////////////////////////////////////////////////////
// Signer base types
////////////////////////////////////////////////////////////
type SignResultMap = {
    email: BaseSignResult;
    "api-key": BaseSignResult;
    "external-wallet": BaseSignResult;
    passkey: PasskeySignResult;
};

export interface Signer<T extends keyof SignResultMap = keyof SignResultMap> {
    type: T;
    locator(): string;
    signMessage(message: string): Promise<SignResultMap[T]>;
    signTransaction(transaction: string): Promise<SignResultMap[T]>;
}
