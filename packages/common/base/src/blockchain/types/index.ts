import { type ObjectValues, objectValues } from "../..";
import { EVMBlockchain, EVMBlockchainTestnet } from "./evm";

export const Blockchain = {
    SOLANA: "solana",
    CARDANO: "cardano",
    SUI: "sui",
    APTOS: "aptos",
    ...EVMBlockchain,
} as const;

export type Blockchain = ObjectValues<typeof Blockchain>;
export const BLOCKCHAINS = objectValues(Blockchain);

export const BlockchainTestnet = {
    ...EVMBlockchainTestnet,
} as const;
export type BlockchainTestnet = ObjectValues<typeof BlockchainTestnet>;
export const BLOCKCHAIN_TESTNETS = objectValues(BlockchainTestnet);

export const BlockchainIncludingTestnet = {
    ...Blockchain,
    ...BlockchainTestnet,
} as const;
export type BlockchainIncludingTestnet = ObjectValues<typeof BlockchainIncludingTestnet>;
export const BLOCKCHAINS_INCLUDING_TESTNETS = objectValues(BlockchainIncludingTestnet);
export const SignerSupportedBlockchains = {
    SOLANA: "solana",
    ...EVMBlockchain,
    ...EVMBlockchainTestnet,
} as const;
export type SignerSupportedBlockchains = ObjectValues<typeof SignerSupportedBlockchains>;
export const SIGNER_SUPPORTED_BLOCKCHAINS = objectValues(SignerSupportedBlockchains);

export * from "./baseLayers";
export * from "./evm";
export * from "./nft";
export * from "./wallet";
