import { StaticJsonRpcProvider } from "@ethersproject/providers";

const POLYGON_RPC_URL = "https://polygon.llamarpc.com/";
const POLYGON_RPC_URL_TEST = "https://rpc-amoy.polygon.technology";

export function getProvider(environment: string) {
    const productionValues = ["prod", "production"];
    if (productionValues.includes(environment)) {
        return new StaticJsonRpcProvider(POLYGON_RPC_URL);
    }
    return new StaticJsonRpcProvider(POLYGON_RPC_URL_TEST);
}
