import { isPolygon, isVerifiableCredentialContractMetadata, parseLocator } from "../services/utils";
import { CredentialsCollection, VC_EVMNFT } from "../types/nfts";
import { NFTService } from "../verification/services/nftStatus";
import { MetadataService } from "./getMetadata";

export async function getNFTFromLocator(locator: string, environment: string) {
    const nft = parseLocator(locator);
    if (!isPolygon(nft.chain)) {
        throw new Error(`Verifiable Credentials are available only on polygon, provided chain: ${nft.chain}`);
    }
    const nftUri = await new NFTService(environment).getNftUri(nft);
    const nftMetadata = await new MetadataService().getFromIpfs(nftUri);

    console.debug(`Nft ${locator} metadata:`, nftMetadata);
    const vcNft: VC_EVMNFT = {
        metadata: nftMetadata,
        locators: locator,
        tokenStandard: "erc-721",
        ...nft,
    };

    const metadata = await new MetadataService().getContractMetadata(nft.contractAddress, environment);
    if (!isVerifiableCredentialContractMetadata(metadata)) {
        throw new Error(`The nft provided is not associated to a VC collection: contract ${nft.contractAddress}`);
    }
    const collection: CredentialsCollection = {
        nfts: [vcNft],
        contractAddress: nft.contractAddress,
        metadata: metadata,
    };

    return {
        nft: vcNft,
        collection: collection,
    };
}
