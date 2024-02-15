import { CrossmintWalletConnectEVMWallet } from "@/types/wallet";
import { JsonRpcSigner, TransactionRequest } from "@ethersproject/providers";

import { getBlockchainByChainId } from "@crossmint/client-sdk-aa";

export class WalletConnectEthersWallet implements CrossmintWalletConnectEVMWallet {
    private constructor(private ethersSigner: JsonRpcSigner) {}

    getSupportedChains() {
        return [getBlockchainByChainId(this.ethersSigner.provider.network.chainId)];
    }

    async getAddress() {
        return this.ethersSigner.getAddress();
    }

    async signMessage(message: Uint8Array) {
        return this.ethersSigner.signMessage(message);
    }

    async sendTransaction(transaction: TransactionRequest) {
        const response = await this.ethersSigner.sendTransaction(transaction);
        return response.hash;
    }
}
