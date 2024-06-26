import { VCNFT } from "@/verifiableCredentialsSKD/types/nft";

import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";

import { CrossmintAPI } from "../services/crossmintAPI";
import { CrossmintWalletNft } from "../types/nfts";
import { isVcChain } from "../verifiableCredentialsSKD/types/utils";

export async function getWalletNfts(chain: string, wallet: string, environment: string) {
    let page = 1;
    let hasMore = true;
    let allData: CrossmintWalletNft[] = [];
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
            throw new Error(`Failed to get nfts`);
        }
    }

    return allData;
}

export function filterPolygonErc721(nfts: CrossmintWalletNft[]): VCNFT[] {
    const vcNfts: VCNFT[] = [];
    for (const nft of nfts) {
        if (isVcChain(nft.chain) && nft.tokenStandard === "erc-721") {
            vcNfts.push({
                chain: nft.chain,
                contractAddress: nft.contractAddress,
                tokenId: nft.tokenId,
            });
        }
    }
    return vcNfts;
}

export async function getWalletVcCompatibleNfts(chain: string, wallet: string, environment: string): Promise<VCNFT[]> {
    const nfts = await getWalletNfts(chain, wallet, environment);
    if (nfts == null) {
        throw new Error("Failed to get nfts");
    }
    console.debug(`Got ${nfts.length} nfts`);

    const polygonErc721Nfts = filterPolygonErc721(nfts);
    console.debug(`Got ${polygonErc721Nfts.length} polygon erc721 nfts`);

    return polygonErc721Nfts;
}
