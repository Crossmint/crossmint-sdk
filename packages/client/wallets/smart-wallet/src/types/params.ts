import type { EIP1193Provider, LocalAccount } from "viem";

export type SmartWalletSDKInitParams = {
    clientApiKey: string;
};

export type UserParams = {
    jwt: string;
};

export type ViemAccount = {
    type: "VIEM_ACCOUNT";
    account: LocalAccount & { source: "custom" };
};

export type PasskeySigner = {
    type: "PASSKEY";

    /**
     * Displayed to the user during passkey registration or signing prompts.
     * If not provided, a default name identifier within the JWT
     * that is specified in the project settings (typically `sub`) will be used.
     */
    passkeyName?: string;
    onPrePasskeyRegistration?: () => Promise<void> | void;
    onPasskeyRegistrationError?: (error: unknown) => Promise<void>;
    onFirstTimePasskeySigning?: () => Promise<void> | void;
    onFirstTimePasskeySigningError?: (error: unknown) => Promise<void>;
};

export type ExternalSigner = EIP1193Provider | ViemAccount;
export interface WalletParams {
    signer: ExternalSigner | PasskeySigner;
}
