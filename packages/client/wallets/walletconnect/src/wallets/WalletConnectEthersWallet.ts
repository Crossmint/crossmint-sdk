import type { CrossmintWalletConnectEVMWallet } from "@/types/wallet";
import type { JsonRpcSigner, TransactionRequest } from "@ethersproject/providers";

import { chainIdToBlockchain } from "@crossmint/common-sdk-base";

export class WalletConnectEthersWallet implements CrossmintWalletConnectEVMWallet {
    constructor(private ethersSigner: JsonRpcSigner) {}

    getSupportedChains() {
        const blockchain = chainIdToBlockchain(this.ethersSigner.provider.network.chainId);
        if (!blockchain) {
            throw new Error(`Unsupported chainId: ${this.ethersSigner.provider.network.chainId}`);
        }
        return [blockchain];
    }

    async getAddress() {
        return this.ethersSigner.getAddress();
    }

    // async signMessage(message: Uint8Array) {
    //     return this.ethersSigner.signMessage(message);
    // }

    async sendTransaction(transaction: TransactionRequest) {
        const response = await this.ethersSigner.sendTransaction(transaction);
        return response.hash;
    }

    async signTypedData(typedData: any) {
        return this.ethersSigner._signTypedData(typedData.domain, typedData.types, typedData.message);
    }
}
