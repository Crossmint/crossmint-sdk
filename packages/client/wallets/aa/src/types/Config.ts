import { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
import { EIP1193Provider, LocalAccount } from "viem";

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

type Signer = EIP1193Provider | Web3AuthSigner | ViemAccount;

export interface WalletConfig {
    signer: Signer;
}
