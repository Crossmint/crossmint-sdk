import { defineChain } from "viem";

export const storyTestnet = defineChain({
    id: 1513,
    name: "DATA Network Aeneid",
    nativeCurrency: {
        decimals: 18,
        name: "DATA",
        symbol: "DATA",
    },
    rpcUrls: {
        default: { http: ["https://testnet.datarpc.io"] },
    },
    blockExplorers: {
        default: {
            name: "DATA Network Aeneid Explorer",
            url: "https://testnet.datanetscan.io",
        },
    },
    testnet: true,
});
