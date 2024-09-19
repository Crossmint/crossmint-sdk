import { type ObjectValues, objectValues } from "@/types";

export const BlockchainBaseLayer = {
    EVM: "evm",
    SOLANA: "solana",
    CARDANO: "cardano",
    SUI: "sui",
    APTOS: "aptos",
} as const;
export type BlockchainBaseLayer = ObjectValues<typeof BlockchainBaseLayer>;
export const BLOCKCHAIN_BASE_LAYERS = objectValues(BlockchainBaseLayer);
