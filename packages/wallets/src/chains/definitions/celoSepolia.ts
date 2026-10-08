import { defineChain } from "viem";

export const celoSepolia = defineChain({
    id: 11142220,
    name: "Celo Sepolia",
    nativeCurrency: {
        decimals: 18,
        name: "CELO",
        symbol: "CELO",
    },
    rpcUrls: {
        default: { http: ["https://forno.celo-sepolia.celo-testnet.org"] },
    },
    blockExplorers: {
        default: {
            name: "Celo Sepolia Blockscout",
            url: "https://celo-sepolia.blockscout.com",
            apiUrl: "https://celo-sepolia.blockscout.com/api",
        },
    },
    testnet: true,
});
