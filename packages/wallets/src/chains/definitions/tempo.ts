import { defineChain } from "viem";

export const tempo = defineChain({
    id: 4217,
    name: "Tempo",
    nativeCurrency: {
        decimals: 6,
        name: "pathUSD",
        symbol: "pathUSD",
    },
    rpcUrls: {
        default: { http: ["https://rpc.tempo.xyz"] },
    },
    blockExplorers: {
        default: {
            name: "Tempo Explorer",
            url: "https://explore.mainnet.tempo.xyz",
        },
    },
    testnet: false,
});
