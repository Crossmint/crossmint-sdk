import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";

import { CrossmintAPI } from "../services/crossmintAPI";
import { VC_EVMNFT } from "../types/nfts";

export async function getWalletNfts(chain: string, wallet: string, environment: string) {
    let page = 1;
    let hasMore = true;
    let allData: VC_EVMNFT[] = [];
    const perPage = 50;

    const baseUrl = getEnvironmentBaseUrl(environment);
    const headers = CrossmintAPI.getHeaders();

    while (hasMore) {
        const url = `${baseUrl}/api/v1-alpha1/wallets/${chain}:${wallet}/nfts?perPage=${perPage}&page=${page}`;
        const options = { method: "GET", headers: headers };

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(
                    `HTTP error! status: ${response.status}, responses: ${JSON.stringify(await response.json())}`
                );
            }
            const data = (await response.json()) as any[];
            allData = [...allData, ...data];
            if (data.length < perPage) {
                hasMore = false;
            } else {
                console.debug(`Got ${data.length} nfts from page ${page}`);
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
    return nfts.filter((nft) => nft.chain.includes("poly") && nft.tokenStandard === "erc-721");
}
