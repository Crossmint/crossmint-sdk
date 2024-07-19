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

/*
 * Chain that ZD uses Gelato as for bundler require special parameters:
 * https://docs.zerodev.app/sdk/faqs/use-with-gelato#transaction-configuration
 */
export const gelatoBundlerProperties = {
    maxFeePerGas: "0x0" as any,
    maxPriorityFeePerGas: "0x0" as any,
};
