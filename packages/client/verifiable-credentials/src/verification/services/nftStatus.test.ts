import { EVMNFT } from "@crossmint/common-sdk-base";

import { NFTStatusService } from "./nftStatus";

jest.mock("../../services/provider");

describe("NFTStatusService", () => {
    let service: NFTStatusService;

    beforeEach(() => {
        service = new NFTStatusService("testEnvironment");
        jest.spyOn(service, "getNftOwnerByContractAddress").mockImplementation(async (contractAddress, tokenId) => {
            if (tokenId === "notBurned") {
                return "mockOwner";
            }
            if (tokenId === "burn error") {
                throw new Error("ERC721: invalid token ID");
            }
            if (tokenId === "error") {
                throw new Error("error");
            }
            throw new Error("ERC721: invalid token ID");
        });
    });

    it("should return false if NFT is not burnt", async () => {
        const mockNFT: EVMNFT = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "notBurned",
        };

        const result = await service.isBurnt(mockNFT);

        expect(result).toBe(false);
    });

    it("should return true if NFT is burnt", async () => {
        const mockNFT: EVMNFT = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "burned",
        };

        const result = await service.isBurnt(mockNFT);

        expect(result).toBe(true);
    });

    it("should return true if NFT is burnt", async () => {
        const mockNFT: EVMNFT = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "burn error",
        };

        const result = await service.isBurnt(mockNFT);

        expect(result).toBe(true);
    });

    it("should throw error if chain is not polygon", async () => {
        const mockNFT: EVMNFT = {
            chain: "notPolygon" as any,
            contractAddress: "mockContractAddress",
            tokenId: "mockTokenId",
        };

        await expect(service.isBurnt(mockNFT)).rejects.toThrow("Only Polygon is supported");
    });

    it("should throw error if failed to check if NFT is burned", async () => {
        const mockNFT: EVMNFT = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "error",
        };

        await expect(service.isBurnt(mockNFT)).rejects.toThrow("Failed to check if NFT is burned");
    });
});
