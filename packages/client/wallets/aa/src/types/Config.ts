import { AuthSig } from "@lit-protocol/types";
import { TORUS_NETWORK_TYPE } from "@web3auth/single-factor-auth";
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
    web3AuthNetwork: TORUS_NETWORK_TYPE;
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
    cipher: Cipher;
}

export interface LitProtocolCipherData {
    pkpPublicKey?: string;
    pkpEthAddress?: string;
    cipherText?: string;
    dataToEncryptHash?: string;
}

export type EncryptInput = {
    messageToEncrypt: string;
    pkpPublicKey: string;
    pkpEthAddress: string;
    capacityDelegationAuthSig: AuthSig;
};

export type DecryptInput = {
    pkpPublicKey: string;
    pkpEthAddress: string;
    cipherText: string;
    dataToEncryptHash: string;
    capacityDelegationAuthSig: AuthSig;
};

type Cipher = { method: "lit_protocol"; data: LitProtocolCipherData };

export type BackwardsCompatibleChains = "mumbai" | "goerli";
