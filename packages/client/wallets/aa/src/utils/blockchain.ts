import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export function hasEIP1559Support(chain: EVMBlockchainIncludingTestnet) {
    const chainsNotSupportingEIP1559: EVMBlockchainIncludingTestnet[] = [
        EVMBlockchainIncludingTestnet.ZKYOTO,
        EVMBlockchainIncludingTestnet.ASTAR_ZKEVM,
    ];
    return !chainsNotSupportingEIP1559.includes(chain);
}
