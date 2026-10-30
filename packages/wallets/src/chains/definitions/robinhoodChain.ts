import { defineChain } from "viem";

export const robinhoodChain = defineChain({
    id: 4663,
    name: "Robinhood Chain",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
    },
    blockExplorers: {
        default: {
            name: "Robinhood Chain Explorer",
            url: "https://robinhoodchain.blockscout.com",
            apiUrl: "https://robinhoodchain.blockscout.com/api",
        },
    },
    testnet: false,
});
