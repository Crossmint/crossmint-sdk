import { StaticJsonRpcProvider } from "@ethersproject/providers";

import { configManager } from "../configs";
import { VCChain } from "../types/chain";

export function getProvider(chain: VCChain) {
    const rpcs = configManager.getBlockchainRpcs();

    for (const rpc of rpcs) {
        if (rpc.chain === chain) {
            return new StaticJsonRpcProvider(rpc.rpc);
        }
    }
    console.log("Available RPCs: ", rpcs);
    throw new Error(`RPC provider not found for chain ${chain}, add it using init(VCSDKConfig).`);
}
