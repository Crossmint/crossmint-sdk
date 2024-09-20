import type { Nft } from "../types";
import { NFTService } from "./nft";

jest.mock("./provider");

describe("NFTStatusService", () => {
    let service: NFTService;

    beforeEach(() => {
        service = new NFTService("polygon-amoy");
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
        const mockNFT: Nft = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "notBurned",
        };

        const result = await service.isBurnt(mockNFT);

        expect(result).toBe(false);
    });

    it("should return true if NFT is burnt", async () => {
        const mockNFT: Nft = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "burned",
        };

        const result = await service.isBurnt(mockNFT);

        expect(result).toBe(true);
    });

    it("should return true if NFT is burnt", async () => {
        const mockNFT: Nft = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "burn error",
        };

        const result = await service.isBurnt(mockNFT);

        expect(result).toBe(true);
    });

    it("should throw error if chain is not polygon", async () => {
        const mockNFT: Nft = {
            chain: "someChain" as any,
            contractAddress: "mockContractAddress",
            tokenId: "mockTokenId",
        };

        await expect(service.isBurnt(mockNFT)).rejects.toThrow(
            "Verifiable credentials are not supported on someChain chain"
        );
    });

    it("should throw error if failed to check if NFT is burned", async () => {
        const mockNFT: Nft = {
            chain: "polygon",
            contractAddress: "mockContractAddress",
            tokenId: "error",
        };

        await expect(service.isBurnt(mockNFT)).rejects.toThrow("Failed to check if NFT is burned");
    });
});
