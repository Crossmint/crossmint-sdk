import { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
import { EntryPoint, EntryPointVersion } from "permissionless/types/entrypoint";
import { EIP1193Provider, HttpTransport, LocalAccount, PublicClient } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export type SmartWalletSDKInitParams = {
    clientApiKey: string;
};

export type UserIdentifierParams = {
    email?: string;
    userId?: string;
    phoneNumber?: string;
};

export type UserIdentifier =
    | { type: "whiteLabel"; userId: string }
    | { type: "email"; email: string }
    | { type: "phoneNumber"; phoneNumber: string };

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

export type EntryPointDetails = { version: EntryPointVersion; address: EntryPoint };

export interface WalletCreationParams {
    user: UserIdentifier;
    chain: EVMBlockchainIncludingTestnet;
    publicClient: PublicClient<HttpTransport>;
    config: WalletConfig;
    entrypoint: EntryPointDetails;
}
