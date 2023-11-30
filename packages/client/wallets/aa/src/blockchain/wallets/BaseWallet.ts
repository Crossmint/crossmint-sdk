import type { SignTypedDataParams } from "@alchemy/aa-core";
import { ZeroDevAccountSigner, ZeroDevEthersProvider } from "@zerodev/sdk";
import { ethers } from "ethers";

import erc721 from "../../ABI/ERC721.json";
import erc1155 from "../../ABI/ERC1155.json";
import { CrossmintService } from "../../api/CrossmintService";
import { TransferError } from "../../utils/error";
import { EVMToken, Token } from "../token/Tokens";

class BaseWallet extends ZeroDevAccountSigner<"ECDSA"> {
    private signer: ZeroDevAccountSigner<"ECDSA">;
    crossmintService: CrossmintService;

    constructor(provider: ZeroDevEthersProvider<"ECDSA">, crossmintService: CrossmintService) {
        super(provider);
        this.crossmintService = crossmintService;
        this.signer = provider.getAccountSigner();
    }

    async getAddress() {
        return this.signer.getAddress();
    }

    async signMessage(message: Uint8Array | string) {
        return this.signer.signMessage(message);
    }

    async signTypedData(params: SignTypedDataParams) {
        return this.signer.signTypedData(params);
    }

    async transfer(toAddress: string, token: Token, quantity?: number): Promise<string> {
        const evmToken = token as EVMToken;
        const contractAddress = evmToken.contractAddress;

        try {
            let transaction;

            const contract = new ethers.Contract(
                contractAddress,
                quantity === undefined ? erc721 : erc1155,
                this.provider
            );
            const contractWithSigner = contract.connect(this);

            if (quantity === undefined) {
                // ERC721
                transaction = await contractWithSigner.functions.transferFrom(
                    await this.getAddress(),
                    toAddress,
                    evmToken.tokenId
                );
            } else {
                // ERC1155
                console.log("ERC1155", toAddress, evmToken.tokenId, quantity, "0x00");
                transaction = await contractWithSigner.functions.safeTransferFrom(
                    await this.getAddress(),
                    toAddress,
                    evmToken.tokenId,
                    quantity,
                    "0x00"
                );
            }

            const receipt = await transaction!.wait();
            console.log("Transaction receipt:", receipt);

            return transaction!.hash;
        } catch (error) {
            console.error("Error transferring token:", error);
            throw new TransferError(`Error transferring token ${evmToken.tokenId}`);
        }
    }
}

export default BaseWallet;
