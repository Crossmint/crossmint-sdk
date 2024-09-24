import { NFTService } from "../onchainServices/nft";
import { IPFSService } from "../services/ipfs";
import type { CredentialsCollection } from "../types/collection";
import type { NftWithMetadata } from "../types/nft";
import { isVcChain, isVerifiableCredentialContractMetadata, parseLocator } from "../types/utils";
import { ContractMetadataService } from "./contractMetadata";

/**
 * Retrieves a Verifiable Credential NFT from a locator.
 *
 * This function performs the following steps:
 * 1. Parses the locator string to extract NFT details.
 * 2. Verifies that the NFT belongs to a supported Verifiable Credentials chain.
 * 3. Fetches the NFT's metadata and verifies it belongs to a Verifiable Credentials collection.
 * 4. Returns the NFT and the corresponding credentials collection.
 *
 * @param locator - The locator string of the credential, formatted as "chain:contractAddress:tokenId" (e.g., "polygon:0x1B887669437644aA348c518844660ef8d63bd643:1").
 * @returns {nft: NftWithMetadata, collection: CredentialsCollection}
 * An object containing:
 * - `collection`: The collection that the NFT belongs to, including the credential metadata.
 * - `nft`: The NFT with its metadata.
 *
 * @throws Will throw an error if the NFT is not on a supported Verifiable Credentials chain or if the NFT is not associated with a Verifiable Credentials collection.
 */
export async function getCredentialNFTFromLocator(locator: string) {
    // Parse the locator to extract NFT details
    const nft = parseLocator(locator);
    if (!isVcChain(nft.chain)) {
        throw new Error(`Verifiable Credentials are not available on the provided chain: ${nft.chain}`);
    }

    // Fetch the URI and metadata of the NFT
    const nftUri = await new NFTService(nft.chain).getNftUri(nft);
    const nftMetadata = await new IPFSService().getFile(nftUri);

    console.debug(`Nft ${locator} metadata:`, nftMetadata);

    // Construct the NFT with metadata
    const vcNft: NftWithMetadata = {
        metadata: nftMetadata,
        ...nft,
    };

    // Retrieve and verify the contract metadata
    const metadata = await new ContractMetadataService(nft.chain).getContractMetadata(nft.contractAddress);

    if (!isVerifiableCredentialContractMetadata(metadata)) {
        throw new Error(`The nft provided is not associated to a VC collection: contract ${nft.contractAddress}`);
    }

    // Construct the collection object with the NFT and its metadata
    const collection: CredentialsCollection = {
        nfts: [vcNft],
        chain: nft.chain,
        contractAddress: nft.contractAddress,
        metadata: metadata,
    };

    // Return the NFT and its collection
    return {
        nft: vcNft,
        collection: collection,
    };
}
