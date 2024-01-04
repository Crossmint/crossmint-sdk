import { UIConfig } from "./uiconfig";

export const EVM_CHAINS = [
    "ethereum",
    "ethereum-sepolia",
    "polygon",
    "bsc",
    "optimism",
    "arbitrum",
    "base",
    "zora",
    "arbitrumnova",
    "zkatana",
] as const;

export const ALL_CHAINS = ["solana", "cardano", "sui", ...EVM_CHAINS] as const;
export type Blockchain = (typeof ALL_CHAINS)[number];

export type EVMBlockchain = (typeof EVM_CHAINS)[number];
export const BLOCKCHAIN_TEST_NET = ["goerli", "ethereum-sepolia", "mumbai", "zkatana"] as const;
export type BlockchainTestNet = (typeof BLOCKCHAIN_TEST_NET)[number];

export const EVM_BLOCKCHAIN_WITH_TESTNET = [...EVM_CHAINS, ...BLOCKCHAIN_TEST_NET] as const;
export type EVMBlockchainWithTestnet = (typeof EVM_BLOCKCHAIN_WITH_TESTNET)[number];

export const ALL_BLOCKCHAIN_WITH_TESTNET = [...ALL_CHAINS, ...BLOCKCHAIN_TEST_NET] as const;
export type AllBlockchainWithTestnet = (typeof ALL_BLOCKCHAIN_WITH_TESTNET)[number];

export interface Wallet {
    chain: string;
    publicKey: string;
}

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
