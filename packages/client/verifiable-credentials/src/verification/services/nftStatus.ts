import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { Contract } from "ethers";
import { constants } from "ethers";

import { EVMNFT } from "@crossmint/common-sdk-base";

import { abi_ERC_721 } from "../../ABI/ERC721";
import { getProvider } from "../../services/provider";

export class NFTService {
    private environment: string;
    private provider: StaticJsonRpcProvider;

    constructor(environment: string) {
        this.environment = environment;
        this.provider = getProvider(this.environment);
    }

    async isBurnt(nft: EVMNFT) {
        if (!nft.chain.includes("poly")) {
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

    async getNftOwnerByContractAddress(contractAddress: string, tokenId: string): Promise<string> {
        const contract = new Contract(contractAddress, abi_ERC_721, this.provider);
        return await contract.ownerOf(tokenId);
    }

    async getNftUri(nft: EVMNFT) {
        const contract = new Contract(nft.contractAddress, abi_ERC_721, this.provider);
        return await contract.tokenURI(nft.tokenId);
    }
}
