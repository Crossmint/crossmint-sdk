import { isPolygon, parseLocator } from "@/services/utils";
import { VC_EVMNFT } from "@/types/nfts";
import { VerifiableCredentialType } from "@/types/verifiableCredential";
import { NFTService } from "@/verification/services/nftStatus";

import { getCredentialFromId } from "./getCredential";
import { MetadataService } from "./getMetadata";

export async function getCredentialFromLocator(
    locator: string,
    environment: string
): Promise<VerifiableCredentialType> {
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

    const credentialId = vcNft.metadata.credentialRetrievalId;
    if (credentialId == null) {
        throw new Error("The given nft has no credential associated");
    }

    const credential = await getCredentialFromId(credentialId, environment);
    if (credential == null) {
        throw new Error("Cannot retrive the credential");
    }
    return credential;
}
