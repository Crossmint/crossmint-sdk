import { defineChain } from "viem";

export const robinhoodChainTestnet = defineChain({
    id: 46630,
    name: "Robinhood Chain Testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
    },
    blockExplorers: {
        default: {
            name: "Robinhood Chain Testnet Explorer",
            url: "https://explorer.testnet.chain.robinhood.com",
            apiUrl: "https://explorer.testnet.chain.robinhood.com/api",
        },
    },
    testnet: true,
});
