import { defineChain } from "viem";

export const arcTestnet = defineChain({
    id: 5042002,
    name: "Arc Testnet",
    nativeCurrency: {
        decimals: 6,
        name: "USDC",
        symbol: "USDC",
    },
    rpcUrls: {
        default: { http: ["https://rpc.testnet.arc.network"] },
    },
    blockExplorers: {
        default: {
            name: "Arc Testnet Explorer",
            url: "https://testnet.arcscan.app",
        },
    },
    testnet: true,
});
