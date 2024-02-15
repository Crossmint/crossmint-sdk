import { Blockchain } from ".";
import { EVMBlockchain } from "./evm";

export interface EVMNFT {
    chain: EVMBlockchain;
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

export type NFTLocator<T extends Blockchain> = `${T}:${string}${T extends EVMBlockchain ? `:${string}` : ""}`;

export type NFT = SolanaNFT | EVMNFT | CardanoNFT;

export type NFTOrNFTLocator =
    | NFT
    | NFTLocator<"solana">
    | NFTLocator<"ethereum">
    | NFTLocator<"polygon">
    | NFTLocator<"bsc">
    | NFTLocator<"cardano">;
