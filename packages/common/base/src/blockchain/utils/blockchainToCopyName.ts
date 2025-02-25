import type { BlockchainIncludingTestnet } from "../types";

export const BLOCKCHAIN_TO_COPY_NAME: Record<BlockchainIncludingTestnet, string> = {
    aptos: "Aptos",
    solana: "Solana",
    ethereum: "Ethereum",
    "ethereum-sepolia": "Ethereum Sepolia",
    "ethereum-goerli": "Ethereum Goerli",
    polygon: "Polygon",
    "polygon-mumbai": "Polygon Mumbai",
    "polygon-amoy": "Polygon Amoy Testnet",
    cardano: "Cardano",
    bsc: "BNB Smart Chain",
    "bsc-testnet": "BNB Smart Chain Testnet",
    sui: "Sui",
    optimism: "Optimism",
    "optimism-goerli": "Optimism Goerli",
    "optimism-sepolia": "Optimism Sepolia",
    arbitrum: "Arbitrum",
    "arbitrum-sepolia": "Arbitrum Sepolia",
    arbitrumnova: "Arbitrum Nova",
    base: "Base",
    "base-goerli": "Base Goerli",
    "base-sepolia": "Base Sepolia",
    zora: "Zora",
    "zora-goerli": "Zora Goerli",
    "zora-sepolia": "Zora Sepolia",
    zkatana: "zKatana",
    zkyoto: "zKyoto",
    "astar-zkevm": "Astar zkEVM",
    apex: "Apex",
    "hypersonic-testnet": "Hypersonic Testnet",
    "story-testnet": "Story Testnet",
    story: "Story Mainnet",
    chiliz: "Chiliz",
};

export function blockchainToDisplayName(blockchain: BlockchainIncludingTestnet) {
    return BLOCKCHAIN_TO_COPY_NAME[blockchain];
}
