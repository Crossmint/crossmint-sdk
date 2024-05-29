import { EntryPointVersion } from "permissionless/_types/types";

import { UserIdentifier } from "./Config";

export type StoreAbstractWalletInput = {
    userIdentifier: UserIdentifier;
    type: string;
    smartContractWalletAddress: string;
    eoaAddress?: string;
    sessionKeySignerAddress?: string;
    version: number;
    baseLayer: string;
    chainId: number;
    entryPointVersion: EntryPointVersion;
};

export type TransferInput = {
    tokenId: number;
    chain: string;
    fromAddress: string;
    toAddress: string;
    tokenMintAddress: string;
};
