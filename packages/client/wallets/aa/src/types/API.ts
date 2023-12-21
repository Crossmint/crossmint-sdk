import { Blockchain } from "../blockchain/BlockchainNetworks";

export type StoreAbstractWalletInput = {
    userEmail: string;
    type: string;
    smartContractWalletAddress: string;
    eoaAddress: string;
    sessionKeySignerAddress: string;
    version: number;
    baseLayer: string;
    chainId: number;
};

export type GenerateSignatureDataInput = {
    smartContractWalletAddress: string;
    sessionKeyData?: string;
    killSwitchData?: string;
    chain: Blockchain | "evm";
    version: number;
};

export type TransferInput = {
    tokenId: number;
    chain: string;
    fromAddress: string;
    toAddress: string;
    tokenMintAddress: string;
};
