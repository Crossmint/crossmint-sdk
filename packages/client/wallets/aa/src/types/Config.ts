import { ethers } from "ethers";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export type CrossmintAASDKInitParams = {
    apiKey: string;
};

export type PasskeysSDKInitParams = {
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

export type SignerType = "ethers" | "viem";

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

type Signer = FireblocksNCWSigner | ethers.Signer | Web3AuthSigner;

export interface WalletConfig {
    signer: Signer;
}

export interface PasskeyCipher {
    chain: BlockchainIncludingTestnet;
    walletAddress: string;
    cipherMethod: CipherMethodTypes;
    cipherData: LitProtocolCipherData;
}

export interface LitProtocolCipherData {
    pkpPublicKey?: string;
    pkpEthAddress?: string;
    cipherText?: string;
    dataToEncryptHash?: string;
}
export type CipherMethodTypes = "lit_protocol";
