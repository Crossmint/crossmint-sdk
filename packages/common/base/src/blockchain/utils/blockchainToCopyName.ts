import { BlockchainIncludingTestnet } from "../types";

export const BLOCKCHAIN_TO_COPY_NAME: Record<BlockchainIncludingTestnet, string> = {
    ethereum: "Ethereum",
    "ethereum-sepolia": "Ethereum Sepolia",
    polygon: "Polygon",
    bsc: "Binance Smart Chain",
    optimism: "Optimism",
    base: "Base",
    arbitrum: "Arbitrum",
    arbitrumnova: "Arbitrum Nova",
    zora: "Zora",
    zkatana: "Zkatana",
    goerli: "Goerli",
    mumbai: "Polygon Mumbai",
    aptos: "Aptos",
    cardano: "Cardano",
    solana: "Solana",
    sui: "Sui",
};

export function blockchainToCopyName(blockchain: BlockchainIncludingTestnet) {
    return BLOCKCHAIN_TO_COPY_NAME[blockchain];
}
