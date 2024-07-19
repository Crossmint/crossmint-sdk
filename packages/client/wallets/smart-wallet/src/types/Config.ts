import { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
import { EntryPoint } from "permissionless/types/entrypoint";
import { EIP1193Provider, LocalAccount } from "viem";

import { SupportedEntryPointVersion } from "./internal";

export type SmartWalletSDKInitParams = {
    clientApiKey: string;
};

export type UserParams = {
    /**
     * A unique identifier for the user. This must match the value of the identifier within the JWT
     * that is specified in the project settings (typically `sub`).
     */
    id: string;
    jwt: string;
};

export type Web3AuthSigner = {
    type: "WEB3_AUTH";
    clientId: string;
    verifierId: string;
    web3AuthNetwork: TORUS_NETWORK_TYPE;
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
     */
    passkeyName: string;
};

export type EOASigner = EIP1193Provider | Web3AuthSigner | ViemAccount;
export interface WalletConfig {
    signer: EOASigner | PasskeySigner;
}

export type EntryPointDetails = { version: SupportedEntryPointVersion; address: EntryPoint };
