import { UIConfig } from "./uiconfig";

export const EVM_CHAINS = ["ethereum", "polygon", "bsc"] as const;
export const ALL_CHAINS = ["solana", "cardano", ...EVM_CHAINS] as const;
export type EVMChain = (typeof EVM_CHAINS)[number];
export type Blockchain = (typeof ALL_CHAINS)[number];

export interface Wallet {
    chain: string;
    publicKey: string;
}

export interface EVMNFT {
    chain: EVMChain;
    contractAddress: string;
    tokenId: string;
}

export interface SolanaNFT {
    mintHash: string;
    chain: "solana";
}

export interface CardanoNFT {
    chain: "cardano";
    assetId: string;
}

export type NFTLocator<T extends Blockchain> = `${T}:${string}${T extends EVMChain ? `:${string}` : ""}`;

export type NFT = SolanaNFT | EVMNFT | CardanoNFT;

export type NFTOrNFTLocator =
    | NFT
    | NFTLocator<"solana">
    | NFTLocator<"ethereum">
    | NFTLocator<"polygon">
    | NFTLocator<"bsc">
    | NFTLocator<"cardano">;

interface CommonProps {
    uiConfig?: UIConfig;
    environment?: string;
}

export interface NFTCollectionViewProps extends CommonProps {
    wallets: Wallet[];
}
export interface NFTDetailProps extends CommonProps {
    nft: NFTOrNFTLocator;
}
