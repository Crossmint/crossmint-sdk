import fetch from "node-fetch";

import { VC_EVMNFT } from "../types/nfts";

const headers = {
    "x-project-id": "e62564a7-06eb-4f65-b389-eb3b7a4f6f98",
    "x-client-secret": "sk_test.ad1f46fe.67853d066b359d071d5cab5ef03382f6",
    accept: "application/json",
};

export async function getWalletNfts(chain: string, wallet: string) {
    let page = 1;
    let hasMore = true;
    let allData: VC_EVMNFT[] = [];
    const perPage = 20;

    while (hasMore) {
        const url = `http://crossmint-main-git-vmc-newprojectid-crossmint.vercel.app/api/v1-alpha1/wallets/${chain}:${wallet}/nfts`;
        const options = { method: "GET", headers: headers };

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, responses: ${response.statusText}`);
            }
            const data = (await response.json()) as any[];
            allData = [...allData, ...data];

            if (data.length < perPage) {
                hasMore = false;
            } else {
                page++;
            }
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    return allData;
}

export function filterPolygonErc721(nfts: VC_EVMNFT[]): VC_EVMNFT[] {
    return nfts.filter((nft) => nft.chain === "polygon" && nft.tokenStandard === "erc-721");
}
