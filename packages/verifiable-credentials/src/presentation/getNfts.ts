import { ethers } from "ethers";
import fetch from "node-fetch";

import { abi_ERC_721 } from "../ABI/ERC721";
import { CredentialFilter } from "../types/credentialFilter";
import { CredentialsCollection, EVMNFT } from "../types/nfts";
import { getCredentialCollections } from "./getMetadata";

const headers = {
    "x-project-id": "e62564a7-06eb-4f65-b389-eb3b7a4f6f98",
    "x-client-secret": "sk_test.ad1f46fe.67853d066b359d071d5cab5ef03382f6",
    // accept: "application/json",
};

async function getWalletNfts(chain: string, wallet: string) {
    let page = 1;
    let hasMore = true;
    let allData: EVMNFT[] = [];
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

export function filterPolygonErc721(nfts: EVMNFT[]): EVMNFT[] {
    return nfts.filter((nft) => nft.chain === "polygon" && nft.tokenStandard === "erc721");
}

export function getCollections(nfts: EVMNFT[]): CredentialsCollection[] {
    const grouped: Record<string, EVMNFT[]> = nfts.reduce((acc, nft) => {
        if (!acc[nft.contractAddress]) {
            acc[nft.contractAddress] = [];
        }
        acc[nft.contractAddress].push(nft);
        return acc;
    }, {} as Record<string, EVMNFT[]>);

    return Object.entries(grouped).map(([contractAddress, nfts]) => ({
        contractAddress,
        nfts,
        metadata: null,
    }));
}

export async function getCredentialNfts(chain: string, wallet: string, filters: CredentialFilter = {}) {
    if (chain !== "polygon") {
        throw new Error("Only polygon is supported");
    }
    const nfts = await getWalletNfts(chain, wallet);
    if (nfts == null) {
        throw new Error("Failed to get nfts");
    }
    const polygonErc721Nfts = filterPolygonErc721(nfts);
    let collections = getCollections(polygonErc721Nfts);
    if (filters.issuers != null) {
        collections = collections.filter((collection) => {
            return filters.issuers?.includes(collection.contractAddress);
        });
    }
    const credentialsCollection = await getCredentialCollections(collections);
    return credentialsCollection;
}
