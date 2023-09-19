import { JsonRpcProvider, StaticJsonRpcProvider } from "@ethersproject/providers";
import { Contract } from "ethers";
import { constants } from "ethers";

import { abi_ERC_721 } from "../ABI/ERC721";
import { VcNft } from "../types/verifiableCredential";

const POLYGON_RPC_URL = "https://rpc-mainnet.maticvigil.com/";
const POLYGON_RPC_URL_TEST = "https://rpc-mumbai.maticvigil.com/";

export class NFTstatusService {
    private environment: string;

    constructor(environment: string) {
        this.environment = environment;
    }

    async isBurned(nft: VcNft) {
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
        const provider = this.getProvider();
        const contract = new Contract(contractAddress, abi_ERC_721, provider);

        return await contract.ownerOf(tokenId);
    }

    private getProvider() {
        const productionValues = ["prod", "production"];
        if (productionValues.includes(this.environment)) {
            return new JsonRpcProvider(POLYGON_RPC_URL);
        }
        return new JsonRpcProvider(POLYGON_RPC_URL_TEST);
    }
}
