import { CredentialFilter } from "../types/credentialFilter";
import { CredentialsCollection, VC_EVMNFT } from "../types/nfts";
import { getContractWithVCMetadata } from "./getMetadata";
import { filterPolygonErc721, getWalletNfts } from "./getNfts";

export function getCollections(nfts: VC_EVMNFT[]): CredentialsCollection[] {
    const grouped: Record<string, VC_EVMNFT[]> = nfts.reduce(
        (acc, nft) => {
            if (!acc[nft.contractAddress]) {
                acc[nft.contractAddress] = [];
            }
            acc[nft.contractAddress].push(nft);
            return acc;
        },
        {} as Record<string, VC_EVMNFT[]>
    );

    return Object.entries(grouped).map(([contractAddress, nfts]) => ({
        contractAddress,
        nfts,
        metadata: undefined,
    }));
}

export async function getCredentialCollections(
    chain: string,
    wallet: string,
    filters: CredentialFilter = {},
    environment: string = "test"
): Promise<CredentialsCollection[]> {
    if (chain !== "polygon") {
        throw new Error("Only polygon is supported");
    }
    const nfts = await getWalletNfts(chain, wallet);
    if (nfts == null) {
        throw new Error("Failed to get nfts");
    }
    console.info(`Got ${nfts.length} nfts`);

    const polygonErc721Nfts = filterPolygonErc721(nfts);
    console.info(`Got ${polygonErc721Nfts.length} polygon erc721 nfts`);

    let collections = getCollections(polygonErc721Nfts);
    console.info(`Got ${collections.length} collections`);

    if (filters.issuers != null) {
        collections = collections.filter((collection) => {
            return filters.issuers?.includes(collection.contractAddress);
        });
    }

    let credentialsCollection = await getContractWithVCMetadata(collections, environment);
    console.info(`Got ${credentialsCollection.length} credential collections`);

    if (filters.types != null) {
        credentialsCollection = credentialsCollection.filter((collection) => {
            return collection.metadata?.credentials.types.some((type: string) => filters.types?.includes(type)); // At least one type must match
        });
    }

    console.info(`Got ${credentialsCollection.length} desired credential collections`);

    return credentialsCollection;
}
