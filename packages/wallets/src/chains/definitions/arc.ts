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
        default: { http: ["https://rpc.arc-scan.org"] },
    },
    blockExplorers: {
        default: {
            name: "Arcscan",
            url: "https://arc-scan.org",
            apiUrl: "https://api.arc-scan.org/api",
        },
    },
    testnet: false,
});
