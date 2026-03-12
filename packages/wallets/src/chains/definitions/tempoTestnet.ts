import { defineChain } from "viem";

export const tempoTestnet = defineChain({
    id: 42431,
    name: "Tempo Testnet",
    nativeCurrency: undefined as never,
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
