import { type Execute, createClient, reservoirChains } from "@reservoir0x/reservoir-sdk";

import type { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

export const listReservoirToken = async (account: EVMSmartWallet, contractAddress: string, tokenId: string) => {
    const client = createClient({
        chains: [
            {
                ...reservoirChains.polygon,
                active: true,
            },
        ],
        source: "reservoir.market",
    });
    const result = await client.actions.listToken({
        listings: [
            {
                token: `${contractAddress}:${tokenId}`,
                weiPrice: "122000000000000",
                orderbook: "reservoir",
                orderKind: "seaport-v1.5",
            },
        ],
        chainId: 137,
        wallet: account.client.wallet as any,

        onProgress: (steps: Execute["steps"]) => {
            console.log("sell steps", steps);
        },
    });

    console.log("sell result", result);
};
