import { GenerateSignatureDataInput, StoreAbstractWalletInput } from "../types/API";

export class CrossmintService {
    private crossmintAPIHeaders: Record<string, string>;

    constructor(clientSecret: string, projectId: string) {
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-client-secret": clientSecret,
            "x-project-id": projectId,
        };
    }

    async createSessionKey(address: string) {
        return this.fetchCrossmintAPI("v2-alpha1/wallets/sessionkey", {
            method: "POST",
            body: JSON.stringify({ address }),
        });
    }

    async storeAbstractWallet(input: StoreAbstractWalletInput) {
        return this.fetchCrossmintAPI("v2-alpha1/wallets", { method: "POST", body: JSON.stringify(input) });
    }

    async generateChainData(input: GenerateSignatureDataInput) {
        return this.fetchCrossmintAPI("v2-alpha1/wallets/chaindata", { method: "POST", body: JSON.stringify(input) });
    }

    async getOrAssignWallet(userEmail: string) {
        return this.fetchCrossmintAPI("v2-alpha1/ncw", { method: "POST", body: JSON.stringify({ userEmail }) });
    }

    async rpc(walletId: string, deviceId: string, payload: string) {
        return this.fetchCrossmintAPI("v2-alpha1/ncw/rpc", {
            method: "POST",
            body: JSON.stringify({ walletId, deviceId, payload }),
        });
    }

    async createTransaction(data: any, walletId: string, assetId: string, typedMessage: boolean) {
        return this.fetchCrossmintAPI("v2-alpha1/ncw/transaction", {
            method: "POST",
            body: JSON.stringify({ data, walletId, assetId, typedMessage }),
        });
    }

    async getSignature(txId: string) {
        return this.fetchCrossmintAPI(`v2-alpha1/ncw/transaction?txId=${txId}`);
    }

    async getAddress(walletId: string, accountId: number, assetId: string) {
        return this.fetchCrossmintAPI(
            `v2-alpha1/ncw/address?walletId=${walletId}&accountId=${accountId}&assetId=${assetId}`
        );
    }

    async getNCWIdentifier(deviceId: string) {
        return this.fetchCrossmintAPI(`v2-alpha1/ncw?deviceId=${deviceId}`);
    }

    async checkVersion(address: string) {
        return this.fetchCrossmintAPI("v2-alpha1/wallets/version/check", {
            method: "POST",
            body: JSON.stringify({ address }),
        });
    }

    async updateWallet(address: string, enableSig: string, version: number) {
        return this.fetchCrossmintAPI("v2-alpha1/wallets/version/check", {
            method: "POST",
            body: JSON.stringify({ address, enableSig, version }),
        });
    }

    async fetchNFTs(address: string) {
        return this.fetchCrossmintAPI(`v1-alpha1/wallets/polygon:${address}/nfts`);
    }

    private async fetchCrossmintAPI(endpoint: string, options: { body?: string; method: string } = { method: "GET" }) {
        const crossmintBaseUrl = "https://staging.crossmint.com/api";
        const url = `${crossmintBaseUrl}/${endpoint}`;
        const { body, method } = options;
        const response = await fetch(url, {
            body,
            method,
            headers: this.crossmintAPIHeaders,
        });
        const json = await response.json();
        return json;
    }
}
