import type { VCChain } from "../types/chain";
import type { Collection, CredentialsCollection } from "../types/collection";
import type { CredentialFilter } from "../types/credentialFilter";
import type { Nft } from "../types/nft";
import { isVcChain, isVcNft } from "../types/utils";
import { ContractMetadataService } from "./contractMetadata";

/**
 * Groups NFTs by their contract address and returns an array of `Collection` objects.
 *
 * This function takes an array of NFTs, groups them by their contract address, and returns an array of `Collection` objects where each collection contains NFTs associated with the same contract.
 *
 * @param nfts - An array of `Nft` objects to group into collections.
 * @returns An array of `Collection` objects, each representing a group of NFTs that share the same contract address.
 */
export function bundleNfts(nfts: Nft[]): Collection[] {
    // Group NFTs by their contract address
    const nftsByAddress: Record<string, Nft[]> = nfts.reduce(
        (acc, nft) => {
            if (!acc[nft.contractAddress]) {
                acc[nft.contractAddress] = [];
            }

            // Push the current NFT to the array associated with its contract address
            acc[nft.contractAddress].push(nft);
            return acc;
        },
        {} as Record<string, Nft[]>
    );

    // Map each contract address and its associated NFTs to a Collection object
    return Object.entries(nftsByAddress).map(([contractAddress, nfts]) => ({
        contractAddress,
        chain: nfts[0].chain, // All NFTs in a Collection should be on the same chain
        nfts,
        metadata: {},
    }));
}

/**
 * Retrieves verifiable credential NFTs for a specified wallet on a specific blockchain.
 *
 * This function fetches NFTs compatible with verifiable credentials from the provided wallet address on the specified chain. It then filters these NFTs based on the provided credential filters, such as issuers and types.
 *
 * @param chain - The blockchain chain on which to retrieve the NFTs.
 * @param wallet - The wallet address from which to retrieve the NFTs.
 * @param getVcCompatibleNftsFromWallet - A function that fetches NFTs compatible with verifiable credentials from a wallet.
 * @param filters - Optional filters to apply when retrieving the credential collections, such as specific issuers or credential types.
 * @returns A promise that resolves to an array of `CredentialsCollection` objects, each representing a collection of NFTs that are associated with verifiable credentials.
 *
 * @throws Will throw an error if the chain is not supported for verifiable credentials or if any of the retrieved NFTs are invalid.
 */
export async function getCredentialNfts(
    chain: VCChain,
    wallet: string,
    getVcCompatibleNftsFromWallet: (chain: VCChain, wallet: string) => Promise<Nft[]>,
    filters: CredentialFilter = {}
): Promise<CredentialsCollection[]> {
    if (!isVcChain(chain)) {
        throw new Error(`Verifiable credentials are not supported on ${chain} chain`);
    }

    console.log(`Getting nfts for wallet ${wallet} on chain ${chain}`);

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

    let credentialsCollection = await new ContractMetadataService(chain).getContractsWithCredentialMetadata(
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
