import type { Blockchain } from ".";
import type { EVMBlockchainIncludingTestnet } from "./evm";

export interface EVMNFT {
    chain: EVMBlockchainIncludingTestnet;
    contractAddress: string;
    tokenId: string;
}

export interface SolanaNFT {
    mintHash: string;
    chain: "solana";
}

export type NFTLocator<T extends Blockchain> = `${T}:${string}${T extends EVMBlockchainIncludingTestnet
    ? `:${string}`
    : ""}`;

export type NFT = SolanaNFT | EVMNFT;

export type NFTOrNFTLocator =
    | NFT
    | NFTLocator<"solana">
    | NFTLocator<"ethereum">
    | NFTLocator<"polygon">
    | NFTLocator<"bsc">;
