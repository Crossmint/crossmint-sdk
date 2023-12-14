import { Blockchain } from "@/blockchain";
import { ethers } from "ethers";

export type CrossmintAASDKInitParams = {
    projectId: string;
    clientSecret: string;
};

export type UserIdentifier = {
    email: string;
    userId?: string;
    phoneNumber?: string;
};

/**
 * Used in v2
 */
export type EthersSigner = any;

export type Web3AuthSigner = {
    type: "WEB3_AUTH";
    clientId: string;
    verifierId: string;
    jwt: string;
};

export type FireblocksNCWSigner = {
    type: "FIREBLOCKS_NCW";
    passphrase: string;
};

type Signer = FireblocksNCWSigner | ethers.Signer | Web3AuthSigner; // V2 add: EthersSigner

export interface WalletConfig {
    signer: Signer;
}
