import { defineChain } from "viem";

export const tempoTestnet = defineChain({
    id: 42431,
    name: "Tempo Testnet",
    nativeCurrency: {
        decimals: 6,
        name: "pathUSD",
        symbol: "pathUSD",
    },
    rpcUrls: {
        default: { http: ["https://rpc.moderato.tempo.xyz"] },
    },
    blockExplorers: {
        default: {
            name: "Tempo Explorer",
            url: "https://explore.tempo.xyz",
        },
    },
    testnet: true,
});
