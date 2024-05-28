import { EntryPointVersion } from "permissionless/_types/types";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { UserIdentifier } from "./Config";

export type StoreAbstractWalletInput = {
    userIdentifier: UserIdentifier;
    type: string;
    smartContractWalletAddress: string;
    signerData: EOASignerData | PasskeysSignerData;
    sessionKeySignerAddress: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: EntryPointVersion;
};

export type GenerateSignatureDataInput = {
    smartContractWalletAddress: `0x${string}`;
    sessionKeyData?: string;
    killSwitchData?: string;
    chain: BlockchainIncludingTestnet | "evm";
    version: number;
};

export type TransferInput = {
    tokenId: number;
    chain: string;
    fromAddress: string;
    toAddress: string;
    tokenMintAddress: string;
};

export interface EOASignerData {
    eoaAddress: string;
    type: "eoa";
}

export interface PasskeysSignerData {
    passkeyName: string;
    passkeyServerUrl: string;
    credentials: string;
    entryPoint: string;
    validatorAddress: string;
    pubKeyX: string;
    pubKeyY: string;
    authenticatorIdHash: string;
    domain: string;
    type: "passkeys";
}
