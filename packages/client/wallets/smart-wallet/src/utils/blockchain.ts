import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

function isPolygonCDK(chain: EVMBlockchainIncludingTestnet) {
    const polygonCDKchains: EVMBlockchainIncludingTestnet[] = [
        EVMBlockchainIncludingTestnet.ZKYOTO,
        EVMBlockchainIncludingTestnet.ZKATANA,
        EVMBlockchainIncludingTestnet.ASTAR_ZKEVM,
        EVMBlockchainIncludingTestnet.HYPERSONIC_TESTNET,
    ];
    return polygonCDKchains.includes(chain);
}

export function usesGelatoBundler(chain: EVMBlockchainIncludingTestnet) {
    return isPolygonCDK(chain);
}
