import { EVMBlockchainIncludingTestnet, EVM_BLOCKCHAIN_INCLUDING_TESTNET } from "../../types";
import { isBlockchainIncludingTestnets } from "../isBlockchainIncludingTestnets";

export function isEVMBlockchain(value: unknown): value is EVMBlockchainIncludingTestnet {
    return EVM_BLOCKCHAIN_INCLUDING_TESTNET.some((chain) => isBlockchainIncludingTestnets(value, chain));
}
