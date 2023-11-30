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
/**
 * Used in v2
 */
export type Web3AuthSigner = any;

export type FireblocksNCWSigner = {
    type: "FIREBLOCKS_NCW";
    passphrase?: string;
};

type Signer = FireblocksNCWSigner | ethers.Signer; // V2 add: EthersSigner | Web3AuthSigner |

export interface WalletConfig {
    signer: Signer;
}
