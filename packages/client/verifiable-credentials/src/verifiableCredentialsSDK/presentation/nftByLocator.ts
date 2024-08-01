import { NFTService } from "../onchainServices/nft";
import { IPFSService } from "../services/ipfs";
import { CredentialsCollection } from "../types/collection";
import { NftWithMetadata } from "../types/nft";
import { isVcChain, isVerifiableCredentialContractMetadata, parseLocator } from "../types/utils";
import { ContractMetadataService } from "./contractMetadata";

/**
 * Get a Verifiable Credential nft from a locator
 * Will return both the nft and the corresponding collection with the credentials metadata
 * @param locator the locator of the credential eg "polygon:0x1B887669437644aA348c518844660ef8d63bd643:1"
 * @returns {nft: NftWithMetadata, collection: CredentialsCollection} the nft and the collection
 */
export async function getCredentialNFTFromLocator(locator: string) {
    const nft = parseLocator(locator);
    if (!isVcChain(nft.chain)) {
        throw new Error(`Verifiable Credentials are not available on the provided chain: ${nft.chain}`);
    }
    const nftUri = await new NFTService(nft.chain).getNftUri(nft);
    const nftMetadata = await new IPFSService().getFile(nftUri);

    console.debug(`Nft ${locator} metadata:`, nftMetadata);
    const vcNft: NftWithMetadata = {
        metadata: nftMetadata,
        ...nft,
    };

    const metadata = await new ContractMetadataService(nft.chain).getContractMetadata(nft.contractAddress);

    if (!isVerifiableCredentialContractMetadata(metadata)) {
        throw new Error(`The nft provided is not associated to a VC collection: contract ${nft.contractAddress}`);
    }
    const collection: CredentialsCollection = {
        nfts: [vcNft],
        chain: nft.chain,
        contractAddress: nft.contractAddress,
        metadata: metadata,
    };

    return {
        nft: vcNft,
        collection: collection,
    };
}
