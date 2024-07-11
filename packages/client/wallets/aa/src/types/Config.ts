import { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
import { EntryPoint, EntryPointVersion } from "permissionless/types/entrypoint";
import { EIP1193Provider, LocalAccount } from "viem";

export type SmartWalletSDKInitParams = {
    clientApiKey: string;
};

export type UserParams = {
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
     * If not provided, a default name will be used.
     */
    passkeyName?: string;
};

export type EOASigner = EIP1193Provider | Web3AuthSigner | ViemAccount;
export interface WalletConfig {
    signer: EOASigner | PasskeySigner;
}

export type EntryPointDetails = { version: EntryPointVersion; address: EntryPoint };
