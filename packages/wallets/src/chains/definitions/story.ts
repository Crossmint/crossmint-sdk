import { defineChain } from "viem";

export const story = defineChain({
    id: 1514,
    name: "DATA Network",
    nativeCurrency: {
        decimals: 18,
        name: "DATA",
        symbol: "DATA",
    },
    rpcUrls: {
        default: { http: ["https://mainnet.datarpc.io"] },
    },
    testnet: false,
});
