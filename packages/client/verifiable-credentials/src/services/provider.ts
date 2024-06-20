import { StaticJsonRpcProvider } from "@ethersproject/providers";

import { isProduction } from "./utils";

const POLYGON_RPC_URL = "https://polygon.llamarpc.com/";
const POLYGON_RPC_URL_TEST = "https://rpc-amoy.polygon.technology/";

export function getProvider(environment: string) {
    if (isProduction(environment)) {
        return new StaticJsonRpcProvider(POLYGON_RPC_URL);
    }
    return new StaticJsonRpcProvider(POLYGON_RPC_URL_TEST);
}
