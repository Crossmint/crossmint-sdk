import { Contract } from "ethers";
import { constants } from "ethers";

import { EVMNFT } from "@crossmint/common-sdk-base";

import { abi_ERC_721 } from "../../ABI/ERC721";
import { getProvider } from "../../services/provider";

export class NFTStatusService {
    private environment: string;

    constructor(environment: string) {
        this.environment = environment;
    }

    async isBurnt(nft: EVMNFT) {
        if (nft.chain !== "polygon") {
            throw new Error("Only Polygon is supported");
        }
        try {
            const owner = await this.getNftOwnerByContractAddress(nft.contractAddress, nft.tokenId);
            return owner === constants.AddressZero;
        } catch (e) {
            if ((e as Error).message.includes("ERC721: invalid token ID")) {
                return true;
            }
            throw new Error(`Failed to check if NFT is burned: ${e}`);
        }
    }

    private async getNftOwnerByContractAddress(contractAddress: string, tokenId: string): Promise<string> {
        const provider = getProvider(this.environment);
        const contract = new Contract(contractAddress, abi_ERC_721, provider);

        return await contract.ownerOf(tokenId);
    }
}
