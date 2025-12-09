import { defineChain } from "viem";

export const tempoTestnet = defineChain({
    id: 42429,
    name: "Tempo Testnet",
    nativeCurrency: {
        decimals: 6,
        name: "LUSD",
        symbol: "LUSD",
    },
    rpcUrls: {
        default: { http: ["https://rpc.testnet.tempo.xyz"] },
    },
    blockExplorers: {
        default: {
            name: "Tempo Scout",
            url: "https://scout.tempo.xyz",
        },
    },
    testnet: true,
});
