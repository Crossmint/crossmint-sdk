import { AddressZero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import type { StaticJsonRpcProvider } from "@ethersproject/providers";

import type { VCChain } from "../types/chain";
import type { Nft } from "../types/nft";
import { isVcChain } from "../types/utils";
import { abi_ERC_721 } from "./ABI/ERC721";
import { abi_ERC_7572 } from "./ABI/ERC7572";
import { getProvider } from "./provider";

export class NFTService {
    private provider: StaticJsonRpcProvider;
    private chain: VCChain;

    constructor(chain: VCChain) {
        this.chain = chain;
        this.provider = getProvider(this.chain);
    }

    async isBurnt(nft: Nft) {
        if (!isVcChain(nft.chain)) {
            throw new Error(`Verifiable credentials are not supported on ${nft.chain} chain`);
        }
        try {
            const owner = await this.getNftOwnerByContractAddress(nft.contractAddress, nft.tokenId);
            return owner === AddressZero;
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

    async getNftUri(nft: Nft) {
        const contract = new Contract(nft.contractAddress, abi_ERC_721, this.provider);
        return await contract.tokenURI(nft.tokenId);
    }

    async getContractURI(contractAddress: string) {
        const contract = new Contract(contractAddress, abi_ERC_7572, this.provider);

        let uri: string;
        try {
            uri = await contract.contractURI();
        } catch (error: any) {
            console.error(`Failed call contractURI() on ${contractAddress}: ${error.message}`);
            return null;
        }

        if (uri != null) {
            console.debug(`Found contract metadata at ${uri} for contract ${contractAddress}`);
        }
        return uri;
    }
}
