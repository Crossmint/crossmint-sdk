import { ContractMetadataService } from "@/verifiableCredentialsSKD/presentation/contractMetadata";
import { Collection, CredentialsCollection } from "@/verifiableCredentialsSKD/types/collection";
import { VCNFT } from "@/verifiableCredentialsSKD/types/nft";
import { isVcChain } from "@/verifiableCredentialsSKD/types/utils";

import { CredentialFilter } from "../types/credentialFilter";

function bundleNfts(nfts: VCNFT[]): Collection[] {
    // Group NFTs by their contract address
    const nftsByAddress: Record<string, VCNFT[]> = nfts.reduce((acc, nft) => {
        if (!acc[nft.contractAddress]) {
            acc[nft.contractAddress] = [];
        }

        // Push the current NFT to the array associated with its contract address
        acc[nft.contractAddress].push(nft);
        return acc;
    }, {} as Record<string, VCNFT[]>);

    // Map each contract address and its associated NFTs to a Collection object
    return Object.entries(nftsByAddress).map(([contractAddress, nfts]) => ({
        contractAddress,
        nfts,
        metadata: {},
    }));
}

export async function getUsersCredentialNfts(
    chain: string,
    wallet: string,
    environment: string,
    getVcCompatibleNftsFromWallet: (chain: string, wallet: string, environment: string) => Promise<VCNFT[]>,
    filters: CredentialFilter = {}
): Promise<CredentialsCollection[]> {
    if (!isVcChain(chain)) {
        throw new Error(`Verifiable credentials are not supported on ${chain} chain`);
    }

    const nfts = await getVcCompatibleNftsFromWallet(chain, wallet, environment);
    console.debug(`Got ${nfts.length} nfts`);

    const collections = bundleNfts(nfts);
    console.debug(`Got ${collections.length} collections`);

    let credentialsCollection = await new ContractMetadataService(
        environment,
        ipfsGateways
    ).retrieveContractsWithMetadata(collections);
    console.debug(`Got ${credentialsCollection.length} valid credential collections`);

    if (filters.issuers != null) {
        credentialsCollection = credentialsCollection.filter((collection) => {
            return filters.issuers?.includes(collection.metadata?.credentialMetadata.issuerDid); // At least one issuer must match
        });
    }

    if (filters.types != null) {
        credentialsCollection = credentialsCollection.filter((collection) => {
            return collection.metadata?.credentialMetadata.type.some((type: string) => filters.types?.includes(type)); // At least one type must match
        });
    }

    console.info(`Got ${credentialsCollection.length} filtered credential collections`);

    return credentialsCollection;
}
