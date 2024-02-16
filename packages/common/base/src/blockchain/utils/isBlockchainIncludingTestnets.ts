import { BLOCKCHAINS_INCLUDING_TESTNETS, Blockchain, BlockchainIncludingTestnet } from "../types";

export function isBlockchainIncludingTestnets<T extends BlockchainIncludingTestnet = BlockchainIncludingTestnet>(
    value: unknown,
    expectedBlockchain?: T
): value is T {
    return expectedBlockchain
        ? value === expectedBlockchain
        : BLOCKCHAINS_INCLUDING_TESTNETS.includes(value as Blockchain);
}
