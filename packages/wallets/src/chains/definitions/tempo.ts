import { defineChain } from "viem";

export const tempo = defineChain({
    id: 4217,
    name: "Tempo",
    nativeCurrency: undefined as never,
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
