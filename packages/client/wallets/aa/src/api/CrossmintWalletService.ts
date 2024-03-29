import { GenerateSignatureDataInput, StoreAbstractWalletInput, UserIdentifier } from "@/types";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import { BaseCrossmintService } from "./BaseCrossmintService";

export { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintWalletService extends BaseCrossmintService {
    async createSessionKey(address: string) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets/sessionkey",
            {
                method: "POST",
                body: JSON.stringify({ address }),
            },
            "Error creating the wallet. Please check the configuration parameters"
        );
    }

    async storeAbstractWallet(input: StoreAbstractWalletInput) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets",
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support"
        );
    }

    async generateChainData(input: GenerateSignatureDataInput) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets/chaindata",
            { method: "POST", body: JSON.stringify(input) },
            "Error setting custodian. Please contact support"
        );
    }

    async getOrAssignWallet(userIdentifier: UserIdentifier) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/ncw",
            { method: "POST", body: JSON.stringify({ userIdentifier }) },
            `Error getting or assigning wallet for user: ${JSON.stringify({ userIdentifier })}`
        );
    }

    async unassignWallet(userIdentifier: UserIdentifier) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/ncw/unassign",
            {
                method: "POST",
                body: JSON.stringify({ userIdentifier }),
            },
            `Error unassigning wallet for user: ${JSON.stringify({ userIdentifier })}`
        );
    }

    async rpc(walletId: string, deviceId: string, payload: string) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/ncw/rpc",
            {
                method: "POST",
                body: JSON.stringify({ walletId, deviceId, payload }),
            },
            "Error creating abstract wallet. Please contact support"
        );
    }

    async createTransaction(data: any, walletId: string, assetId: string, typedMessage: boolean) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/ncw/transaction",
            {
                method: "POST",
                body: JSON.stringify({ data, walletId, assetId, typedMessage }),
            },
            `Error creating transaction for wallet: ${walletId}`
        );
    }

    async getSignature(txId: string) {
        return this.fetchCrossmintAPI(
            `unstable/wallets/aa/ncw/transaction?txId=${txId}`,
            { method: "GET" },
            `Error getting signature for transaction: ${txId}`
        );
    }

    async getAddress(walletId: string, accountId: number, assetId: string) {
        return this.fetchCrossmintAPI(
            `unstable/wallets/aa/ncw/address?walletId=${walletId}&accountId=${accountId}&assetId=${assetId}`,
            { method: "GET" },
            `Error getting address for wallet: ${walletId}, account: ${accountId} and asset: ${assetId}`
        );
    }

    async getNCWIdentifier(deviceId: string) {
        return this.fetchCrossmintAPI(
            `unstable/wallets/aa/ncw?deviceId=${deviceId}`,
            { method: "GET" },
            `Error getting NCW identifier for device: ${deviceId}`
        );
    }

    async checkVersion(address: string) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets/version/check",
            {
                method: "POST",
                body: JSON.stringify({ address }),
            },
            `Error checking version for wallet: ${address}`
        );
    }

    async updateWallet(address: string, enableSig: string, version: number) {
        return this.fetchCrossmintAPI(
            "unstable/wallets/aa/wallets/version/update",
            {
                method: "POST",
                body: JSON.stringify({ address, enableSig, version }),
            },
            `Error updating wallet: ${address}`
        );
    }

    async fetchNFTs(address: string, chain: EVMBlockchainIncludingTestnet) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/${chain}:${address}/nfts`,
            { method: "GET" },
            `Error fetching NFTs for wallet: ${address}`
        );
    }
}
