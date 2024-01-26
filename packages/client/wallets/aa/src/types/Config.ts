import { IProvider } from "@web3auth/base";

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

export type Web3AuthSigner = {
    type: "WEB3_AUTH";
    clientId: string;
    verifierId: string;
    jwt: string;
};

export type Provider = {
    type: "PROVIDER";
    provider: IProvider;
};

type Signer = Web3AuthSigner | IProvider;

export interface WalletConfig {
    signer: Signer;
}
