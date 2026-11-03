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
        default: { http: ["https://rpc.mainnet.arc.io"] },
    },
    blockExplorers: {
        default: {
            name: "Arc Explorer",
            url: "https://explorer.arc.io",
            apiUrl: "https://explorer.arc.io/api/v2",
        },
    },
    testnet: false,
});
