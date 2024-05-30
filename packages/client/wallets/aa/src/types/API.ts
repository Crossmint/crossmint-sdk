import { EntryPointVersion } from "permissionless/_types/types";

import { UserIdentifier } from "./Config";

export type StoreAbstractWalletInput = {
    userIdentifier: UserIdentifier;
    type: string;
    smartContractWalletAddress: string;
    signerData: EOASignerData;
    sessionKeySignerAddress?: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: EntryPointVersion;
};

export interface EOASignerData {
    eoaAddress: string;
    type: "eoa";
}

export type TransferInput = {
    tokenId: number;
    chain: string;
    fromAddress: string;
    toAddress: string;
    tokenMintAddress: string;
};
