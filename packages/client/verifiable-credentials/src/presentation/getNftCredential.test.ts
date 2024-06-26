import { NFTService } from "../verification/services/nftStatus";
import { MetadataService } from "./getMetadata";
import { getNFTFromLocator } from "./getNftCredential";

jest.mock("../verification/services/nftStatus");
jest.mock("./getMetadata");

describe("getNFTFromLocator", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("should throw error if chain is not polygon", async () => {
        await expect(getNFTFromLocator("ethereum:0x1234:1", "environment")).rejects.toThrow(
            "Verifiable Credentials are available only on polygon, provided chain: ethereum"
        );
    });

    it("should fetch and return the NFT and its collection", async () => {
        const mockNftUri = "ipfs://uri";
        const mockNftMetadata = { name: "NFT Name" };
        const mockCollection = { contractAddress: "0x1234", metadata: {} };

        (NFTService.prototype.getNftUri as jest.Mock).mockResolvedValue(mockNftUri);
        (MetadataService.prototype.getFromIpfs as jest.Mock).mockResolvedValue(mockNftMetadata);
        (MetadataService.prototype.getContractWithVCMetadata as jest.Mock).mockResolvedValue([mockCollection]);

        const result = await getNFTFromLocator("polygon:0x1234:1", "environment");

        expect(result).toEqual({
            nft: {
                metadata: mockNftMetadata,
                locators: "polygon:0x1234:1",
                tokenStandard: "erc-721",
                chain: "polygon",
                contractAddress: "0x1234",
                tokenId: "1",
            },
            collection: mockCollection,
        });
    });
});
