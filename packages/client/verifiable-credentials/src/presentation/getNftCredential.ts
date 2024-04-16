import { isPolygon, parseLocator } from "../services/utils";
import { VC_EVMNFT } from "../types/nfts";
import { NFTService } from "../verification/services/nftStatus";
import { MetadataService } from "./getMetadata";

export async function getNftFromLocator(locator: string, environment: string) {
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

    const collection = (
        await new MetadataService().getContractWithVCMetadata(
            [
                {
                    nfts: [vcNft],
                    contractAddress: nft.contractAddress,
                    metadata: {} as any,
                },
            ],
            environment
        )
    )[0];

    return {
        nft: vcNft,
        collection,
    };
}
