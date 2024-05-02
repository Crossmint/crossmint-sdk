import { EntryPointVersion } from "permissionless/_types/types";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { UserIdentifier } from "./Config";

export type StoreAbstractWalletInput = {
    userIdentifier: UserIdentifier;
    type: string;
    smartContractWalletAddress: string;
    eoaAddress: string;
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
