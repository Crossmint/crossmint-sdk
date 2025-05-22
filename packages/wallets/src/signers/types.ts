import { Chain, SolanaChain } from "../chains/chains";
import { WebAuthnP256 } from "ox";

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
}

export type ExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSignMessage?: (message: string) => Promise<string>;
};

export type ApiKeySignerConfig = { type: "api-key" };

export type BaseSignerConfig = EmailSignerConfig | ExternalWalletSignerConfig | ApiKeySignerConfig;

export type PasskeySignerConfig = {
    type: "passkey";
    name: string;
    id: string;
    onCreatePasskey?: (
        name: string
    ) => Promise<{ id: string; publicKey: { x: string; y: string } }>;
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

export interface Signer<
    T extends keyof SignResultMap = keyof SignResultMap
> {
    type: T;
    legacyLocator(): string;
    sign(message: string): Promise<SignResultMap[T]>;
}
