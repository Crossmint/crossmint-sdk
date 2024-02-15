import { EVMBlockchainIncludingTestnet } from "../../types";
import { BLOCKCHAIN_TO_CHAIN_ID } from "./blockchainToChainId";

export const CHAIN_ID_TO_BLOCKCHAIN: Record<number, EVMBlockchainIncludingTestnet> = Object.entries(
    BLOCKCHAIN_TO_CHAIN_ID
).reduce((acc, [key, value]) => {
    acc[value] = key as EVMBlockchainIncludingTestnet;
    return acc;
}, {} as Record<number, EVMBlockchainIncludingTestnet>);

export function chainIdToBlockchain(chainId: number): EVMBlockchainIncludingTestnet | undefined {
    return CHAIN_ID_TO_BLOCKCHAIN[chainId];
}
