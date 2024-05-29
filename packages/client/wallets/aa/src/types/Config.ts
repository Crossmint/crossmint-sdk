import { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
import { KernelAccountClient, KernelSmartAccount } from "@zerodev/sdk";
import { EntryPoint } from "permissionless/_types/types";
import { Chain, EIP1193Provider, HttpTransport, LocalAccount, PublicClient } from "viem";

export type CrossmintAASDKInitParams = {
    apiKey: string;
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

export type SignerMap = {
    viem: Client;
};

export type SignerType = keyof SignerMap;

export type Web3AuthSigner = {
    type: "WEB3_AUTH";
    clientId: string;
    verifierId: string;
    web3AuthNetwork: TORUS_NETWORK_TYPE;
    jwt: string;
};

export type ViemAccount = {
    type: "VIEM_ACCOUNT";
    account: LocalAccount;
};

type Signer = EIP1193Provider | Web3AuthSigner | ViemAccount;

export interface WalletConfig {
    signer: Signer;
}

export type BackwardsCompatibleChains = "goerli";

export type Client = {
    publicClient: PublicClient;
    walletClient: KernelAccountClient<EntryPoint, HttpTransport, Chain, KernelSmartAccount<EntryPoint, HttpTransport>>;
};
