import type { CrossmintWalletConnectEVMWallet } from "@/types/wallet";
import type { TransactionRequest } from "@ethersproject/abstract-provider";

import type { EVMAAWallet } from "@crossmint/client-sdk-aa";

export class WalletConnectEVMAAWallet implements CrossmintWalletConnectEVMWallet {
    constructor(private aaWallet: EVMAAWallet) {}

    getSupportedChains() {
        return [this.aaWallet.chain];
    }

    async getAddress() {
        return this.aaWallet.getAddress();
    }

    async signMessage(message: Uint8Array) {
        return this.aaWallet.signMessage(message);
    }

    async sendTransaction(transaction: TransactionRequest) {
        const response = await this.aaWallet.sendTransaction(transaction);
        return response;
    }
}
