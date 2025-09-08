import type { CrossmintWalletConnectEVMWallet } from "@/types/wallet";
import type { TransactionRequest } from "@ethersproject/abstract-provider";

export class WalletConnectEVMAAWallet implements CrossmintWalletConnectEVMWallet {
    // TODO: Wallets team to ensure removing this class
    constructor(private aaWallet: any) {}

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
