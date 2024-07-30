import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { SmartWalletChain } from "..";

function isPolygonCDK(chain: EVMBlockchainIncludingTestnet) {
    const polygonCDKchains: EVMBlockchainIncludingTestnet[] = [
        EVMBlockchainIncludingTestnet.ZKYOTO,
        EVMBlockchainIncludingTestnet.ZKATANA,
        EVMBlockchainIncludingTestnet.ASTAR_ZKEVM,
        EVMBlockchainIncludingTestnet.HYPERSONIC_TESTNET,
    ];
    return polygonCDKchains.includes(chain);
}

export function usesGelatoBundler(chain: SmartWalletChain) {
    return false;
}
