import { StaticJsonRpcProvider } from "@ethersproject/providers";

import { configManager } from "../configs";
import type { VCChain } from "../types/chain";

export function getProvider(chain: VCChain) {
    const rpcs = configManager.getBlockchainRpcs();

    if (rpcs[chain] === undefined) {
        throw new Error(`RPC provider not found for chain ${chain}, add it using init(VCSDKConfig).`);
    }
    return new StaticJsonRpcProvider(rpcs[chain]);
}
