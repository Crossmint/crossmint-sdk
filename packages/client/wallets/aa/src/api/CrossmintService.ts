import { getApiUrlByBlockchainType } from "@/blockchain";
import { logError } from "@/services/logging";
import { GenerateSignatureDataInput, StoreAbstractWalletInput } from "@/types";
import { CROSSMINT_STG_URL } from "@/utils";
import { CrossmintServiceError, errorToJSON } from "@/utils/error";

import { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class CrossmintService {
    private crossmintAPIHeaders: Record<string, string>;
    private crossmintBaseUrl: string;

    constructor(clientSecret: string, projectId: string) {
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-client-secret": clientSecret,
            "x-project-id": projectId,
        };
        this.crossmintBaseUrl = CROSSMINT_STG_URL;
    }

    setCrossmintUrl(blockchain: BlockchainIncludingTestnet) {
        this.crossmintBaseUrl = getApiUrlByBlockchainType(blockchain);
    }

    async createSessionKey(address: string) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/wallets/sessionkey",
            {
                method: "POST",
                body: JSON.stringify({ address }),
            },
            "Error creating the wallet. Please check the configuration parameters"
        );
    }

    async storeAbstractWallet(input: StoreAbstractWalletInput) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/wallets",
            { method: "POST", body: JSON.stringify(input) },
            "Error creating abstract wallet. Please contact support"
        );
    }

    async generateChainData(input: GenerateSignatureDataInput) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/wallets/chaindata",
            { method: "POST", body: JSON.stringify(input) },
            "Error setting custodian. Please contact support"
        );
    }

    async getOrAssignWallet(userEmail: string) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/ncw",
            { method: "POST", body: JSON.stringify({ userEmail }) },
            `Error getting or assigning wallet for user: ${userEmail}`
        );
    }

    async unassignWallet(userEmail: string) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/ncw/unassign",
            {
                method: "POST",
                body: JSON.stringify({ userEmail }),
            },
            `Error unassigning wallet for user: ${userEmail}`
        );
    }

    async rpc(walletId: string, deviceId: string, payload: string) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/ncw/rpc",
            {
                method: "POST",
                body: JSON.stringify({ walletId, deviceId, payload }),
            },
            "Error creating abstract wallet. Please contact support"
        );
    }

    async createTransaction(data: any, walletId: string, assetId: string, typedMessage: boolean) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/ncw/transaction",
            {
                method: "POST",
                body: JSON.stringify({ data, walletId, assetId, typedMessage }),
            },
            `Error creating transaction for wallet: ${walletId}`
        );
    }

    async getSignature(txId: string) {
        return this.fetchCrossmintAPI(
            `v2-alpha1/ncw/transaction?txId=${txId}`,
            { method: "GET" },
            `Error getting signature for transaction: ${txId}`
        );
    }

    async getAddress(walletId: string, accountId: number, assetId: string) {
        return this.fetchCrossmintAPI(
            `v2-alpha1/ncw/address?walletId=${walletId}&accountId=${accountId}&assetId=${assetId}`,
            { method: "GET" },
            `Error getting address for wallet: ${walletId}, account: ${accountId} and asset: ${assetId}`
        );
    }

    async getNCWIdentifier(deviceId: string) {
        return this.fetchCrossmintAPI(
            `v2-alpha1/ncw?deviceId=${deviceId}`,
            { method: "GET" },
            `Error getting NCW identifier for device: ${deviceId}`
        );
    }

    async checkVersion(address: string) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/wallets/version/check",
            {
                method: "POST",
                body: JSON.stringify({ address }),
            },
            `Error checking version for wallet: ${address}`
        );
    }

    async updateWallet(address: string, enableSig: string, version: number) {
        return this.fetchCrossmintAPI(
            "v2-alpha1/wallets/version/check",
            {
                method: "POST",
                body: JSON.stringify({ address, enableSig, version }),
            },
            `Error updating wallet: ${address}`
        );
    }

    async fetchNFTs(address: string) {
        return this.fetchCrossmintAPI(
            `v1-alpha1/wallets/polygon:${address}/nfts`,
            { method: "GET" },
            `Error fetching NFTs for wallet: ${address}`
        );
    }

    private async fetchCrossmintAPI(
        endpoint: string,
        options: { body?: string; method: string } = { method: "GET" },
        onServerErrorMessage: string
    ) {
        const url = `${this.crossmintBaseUrl}/${endpoint}`;
        const { body, method } = options;

        try {
            const response = await fetch(url, {
                body,
                method,
                headers: this.crossmintAPIHeaders,
            });
            if (!response.ok) {
                if (response.status >= 500) {
                    // Crossmint throws a generic “An error occurred” error for all 5XX errors.
                    // We throw a more specific error depending on the endpoint that was called.
                    throw new CrossmintServiceError(onServerErrorMessage);
                }
                // We forward all 4XX errors. This includes rate limit errors.
                // It also includes chain not found, as it is a bad request error.
                throw new CrossmintServiceError(await response.text());
            }
            return await response.json();
        } catch (error) {
            logError("[CROSSMINT_SERVICE] - ERROR", {
                error: errorToJSON(error),
            });
            throw new CrossmintServiceError(`Error fetching Crossmint API: ${error}`);
        }
    }
}
