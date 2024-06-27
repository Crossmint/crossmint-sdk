import { VCChain } from "../types/chain";
import { Collection, CredentialsCollection } from "../types/collection";
import { CredentialFilter } from "../types/credentialFilter";
import { VCNFT } from "../types/nft";
import { isVcChain, isVcNft } from "../types/utils";
import { ContractMetadataService } from "./contractMetadata";

export function bundleNfts(nfts: VCNFT[]): Collection[] {
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
    chain: VCChain,
    wallet: string,
    getVcCompatibleNftsFromWallet: (chain: VCChain, wallet: string) => Promise<VCNFT[]>,
    filters: CredentialFilter = {}
): Promise<CredentialsCollection[]> {
    if (!isVcChain(chain)) {
        throw new Error(`Verifiable credentials are not supported on ${chain} chain`);
    }

    const nfts = await getVcCompatibleNftsFromWallet(chain, wallet);
    console.debug(`Got ${nfts.length} nfts`);

    nfts.forEach((nft) => {
        if (!isVcNft(nft)) {
            throw new Error(`Not a valid VC nftt: ${nft}`);
        }
        if (!isVcChain(nft.chain)) {
            throw new Error(`Verifiable credentials are not supported on this nft chain: ${nft}`);
        }
    });

    const collections = bundleNfts(nfts);
    console.debug(`Got ${collections.length} collections`);

    let credentialsCollection = await new ContractMetadataService(chain).retrieveContractCredentialMetadata(
        collections
    );
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
