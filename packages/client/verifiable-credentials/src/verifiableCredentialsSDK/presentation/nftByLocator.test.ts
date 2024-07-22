import { NFTService } from "../onchainServices/nft";
import { IPFSService } from "../services/ipfs";
import { ContractMetadataService } from "./contractMetadata";
import { getCredentialNFTFromLocator } from "./nftByLocator";

jest.mock("../onchainServices/nft");
jest.mock("./contractMetadata");
jest.mock("../services/ipfs");

describe("getCredentialNFTFromLocator", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("should throw error if chain is not supported", async () => {
        await expect(getCredentialNFTFromLocator("ethereum:0x1234:1")).rejects.toThrow(
            "Verifiable Credentials are not available on the provided chain: ethereum"
        );
    });

    it("should fetch and return the NFT and its collection", async () => {
        const mockNftUri = "ipfs://uri";
        const mockNftMetadata = { name: "NFT Name" };
        const collectionMetadata = {
            a: "a",
            credentialMetadata: {
                issuerDid: "issuerDid",
                type: ["type1", "type2"],
                credentialsEndpoint: "credentialsEndpoint",
            },
        };
        (NFTService.prototype.getNftUri as jest.Mock).mockResolvedValue(mockNftUri);
        (IPFSService.prototype.getFile as jest.Mock).mockResolvedValue(mockNftMetadata);
        (ContractMetadataService.prototype.getContractMetadata as jest.Mock).mockResolvedValue(collectionMetadata);

        const result = await getCredentialNFTFromLocator("polygon:0x1234:1");

        const resNft = {
            metadata: mockNftMetadata,
            chain: "polygon",
            contractAddress: "0x1234",
            tokenId: "1",
        };

        expect(result).toEqual({
            nft: resNft,
            collection: {
                chain: "polygon",
                nfts: [resNft],
                metadata: collectionMetadata,
                contractAddress: resNft.contractAddress,
            },
        });
    });
});
