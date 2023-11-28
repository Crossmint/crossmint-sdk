import { EVMBlockchain } from "../BlockchainNetworks";

export interface EVMToken {
    chain: EVMBlockchain;
    contractAddress: string;
    tokenId: string;
}
export interface SolanaToken {
    mintHash: string;
    chain: "solana";
}
export interface CardanoToken {
    chain: "cardano";
    assetId: string;
}

export type Token = EVMToken | SolanaToken | CardanoToken;
export type TokenType = "NFT" | "SFT" | "FT";
