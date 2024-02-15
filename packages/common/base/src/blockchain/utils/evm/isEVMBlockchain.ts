import { EVMBlockchainIncludingTestnet, EVM_BLOCKCHAINS_INCLUDING_TESTNETS } from "../../types";
import { isBlockchainIncludingTestnets } from "../isBlockchainIncludingTestnets";

export function isEVMBlockchain(value: unknown): value is EVMBlockchainIncludingTestnet {
    return EVM_BLOCKCHAINS_INCLUDING_TESTNETS.some((chain) => isBlockchainIncludingTestnets(value, chain));
}
