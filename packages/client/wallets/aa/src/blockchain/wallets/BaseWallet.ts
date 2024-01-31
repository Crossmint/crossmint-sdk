import type { KernelSmartAccount } from "@zerodev/sdk";

import { CrossmintService } from "../../api/CrossmintService";

class BaseWallet {
    masterAccount: KernelSmartAccount;
    crossmintService: CrossmintService;

    constructor(masterAccount: KernelSmartAccount, crossmintService: CrossmintService) {
        this.masterAccount = masterAccount;
        this.crossmintService = crossmintService;
    }

    /*
    async transfer(toAddress: string, token: Token, quantity?: number, amount?: BigNumber): Promise<string> {
        const evmToken = token as EVMToken;
        const contractAddress = evmToken.contractAddress;

        try {
            let transaction;

            const contract = new ethers.Contract(
                contractAddress,
                amount !== undefined ? erc20 : quantity !== undefined ? erc1155 : erc721,
                this.provider
            );
            const contractWithSigner = contract.connect(this);

            if (amount !== undefined) {
                // Transfer ERC20
                transaction = await contractWithSigner.functions.transfer(toAddress, amount);
            } else if (quantity !== undefined) {
                // Transfer ERC1155
                transaction = await contractWithSigner.functions.safeTransferFrom(
                    await this.getAddress(),
                    toAddress,
                    evmToken.tokenId,
                    quantity,
                    "0x00"
                );
            } else {
                // Transfer ERC721
                transaction = await contractWithSigner.functions.transferFrom(
                    await this.getAddress(),
                    toAddress,
                    evmToken.tokenId
                );
            }

            const receipt = await transaction!.wait();
            if (receipt.status === 1) {
                return transaction!.hash;
            } else {
                throw new TransferError(
                    `Error transferring token ${evmToken.tokenId}${
                        !transaction || !transaction.hash ? "" : ` with transaction hash ${transaction.hash}`
                    }`
                );
            }
        } catch (error) {
            throw new TransferError(`Error transferring token ${evmToken.tokenId}`);
        }
    }

    async sendTransaction(transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
        try {
            return await super.sendTransaction(transaction);
        } catch (error) {
            throw new TransactionError(`Error sending transaction: ${error}`);
        }
    }*/
}

export default BaseWallet;
