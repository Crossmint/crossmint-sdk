import { defineChain } from "viem";

export const arc = defineChain({
    id: 5042,
    name: "Arc",
    nativeCurrency: {
        decimals: 18,
        name: "USDC",
        symbol: "USDC",
    },
    rpcUrls: {
        default: { http: ["https://rpc.arc.network"] },
    },
    blockExplorers: {
        default: {
            name: "Arcscan",
            url: "https://arcscan.app",
        },
    },
    testnet: false,
});
