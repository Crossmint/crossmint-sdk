import { ethers } from "ethers";

export type CrossmintAASDKInitParams = {
    apiKey: string;
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

type FireblocksNCWSignerBase = {
    type: "FIREBLOCKS_NCW";
    passphrase: string;
};
export type FireblocksNCWSigner =
    | FireblocksNCWSignerBase
    | (FireblocksNCWSignerBase & {
          walletId: string;
          deviceId: string;
      });

type Signer = FireblocksNCWSigner | ethers.Signer | Web3AuthSigner; // V2 add: EthersSigner

export interface WalletConfig {
    signer: Signer;
}
