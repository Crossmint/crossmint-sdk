import { VcNft } from "../types/verifiableCredential.js";
import { Contract } from "ethers";
import { abi_ERC_721 } from "../ABI/ERC721.js";
import { constants } from "ethers";

import {
    JsonRpcProvider,
    StaticJsonRpcProvider,
} from "@ethersproject/providers";

// const POLYGON_RPC_URL = "https://rpc-mainnet.maticvigil.com/";
const POLYGON_RPC_URL = "https://rpc-mumbai.maticvigil.com/";

export class NFTstatusService {
    async isBurned(nft: VcNft) {
        if (nft.chain !== "polygon") {
            throw new Error("Only Polygon is supported");
        }
        try {
            const owner = await this.getNftOwnerByContractAddress(
                nft.contractAddress,
                nft.tokenId
            );
            return owner === constants.AddressZero;
        } catch (e) {
            if ((e as Error).message.includes("ERC721: invalid token ID")) {
                return true;
            }
            throw new Error(`Failed to check if NFT is burned: ${e}`);
        }
    }

    private async getNftOwnerByContractAddress(
        contractAddress: string,
        tokenId: string
    ): Promise<string> {
        const provider = new JsonRpcProvider(POLYGON_RPC_URL); // StaticJsonRpcProvider
        const contract = new Contract(contractAddress, abi_ERC_721, provider);

        return await contract.ownerOf(tokenId);
    }
}
