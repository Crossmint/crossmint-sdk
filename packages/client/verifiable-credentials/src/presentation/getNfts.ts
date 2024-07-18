import { Nft, isVcChain } from "@/verifiableCredentialsSDK";

import { crossmintAPI } from "../crossmintAPI";
import { CrossmintWalletNft } from "../types/nfts";

export async function getWalletNfts(chain: string, wallet: string) {
    let page = 1;
    let hasMore = true;
    let allData: CrossmintWalletNft[] = [];
    const perPage = 50;

    const baseUrl = crossmintAPI.getBaseUrl();
    const headers = crossmintAPI.getHeaders();

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

export function filterVCCompErc721(nfts: CrossmintWalletNft[]): Nft[] {
    const vcNfts: Nft[] = [];
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

export async function getWalletVcCompatibleNfts(chain: string, wallet: string): Promise<Nft[]> {
    const nfts = await getWalletNfts(chain, wallet);
    if (nfts == null) {
        throw new Error("Failed to get nfts");
    }
    console.debug(`Got ${nfts.length} nfts`);

    const compatibleNfts = filterVCCompErc721(nfts);
    console.debug(`Got ${compatibleNfts.length} compatible erc721 nfts`);

    return compatibleNfts;
}
