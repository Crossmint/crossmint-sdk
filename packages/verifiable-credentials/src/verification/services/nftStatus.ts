import { JsonRpcProvider, StaticJsonRpcProvider } from "@ethersproject/providers";
import { Contract } from "ethers";
import { constants } from "ethers";

import { EVMNFT } from "@crossmint/client-sdk-base";

import { abi_ERC_721 } from "../../ABI/ERC721";

const POLYGON_RPC_URL = "https://rpc-mainnet.maticvigil.com/";
const POLYGON_RPC_URL_TEST = "https://rpc-mumbai.maticvigil.com/";

export class NFTStatusService {
    private environment: string;

    constructor(environment: string) {
        this.environment = environment;
    }

    async isBurned(nft: EVMNFT) {
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
