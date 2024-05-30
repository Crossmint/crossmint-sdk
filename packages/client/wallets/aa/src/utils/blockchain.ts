import { getBundlerRPC } from "@/blockchain";
import { createPublicClient, http } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export type VerifyMessageParams = {
    address: `0x${string}`;
    message: string;
    signature: `0x${string}` | Uint8Array;
    chain: EVMBlockchainIncludingTestnet;
};

export async function verifyMessage({ address, message, signature, chain }: VerifyMessageParams) {
    const publicClient = createPublicClient({
        transport: http(getBundlerRPC(chain)),
    });

    return publicClient.verifyMessage({
        address,
        message,
        signature,
    });
}

function isPolygonCDK(chain: EVMBlockchainIncludingTestnet) {
    const polygonCDKchains: EVMBlockchainIncludingTestnet[] = [
        EVMBlockchainIncludingTestnet.ZKYOTO,
        EVMBlockchainIncludingTestnet.ASTAR_ZKEVM,
    ];
    return polygonCDKchains.includes(chain);
}

export function usesGelatoBundler(chain: EVMBlockchainIncludingTestnet) {
    return isPolygonCDK(chain);
}
