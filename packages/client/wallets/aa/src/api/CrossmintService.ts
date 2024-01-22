import { logError } from "@/services/logging";
import { GenerateSignatureDataInput, StoreAbstractWalletInput, UserIdentifier } from "@/types";
import { CrossmintServiceError, errorToJSON } from "@/utils/error";

import { validateAPIKey } from "@crossmint/common-sdk-base";

import { CROSSMINT_DEV_URL, CROSSMINT_PROD_URL, CROSSMINT_STG_URL } from "../utils";

export class CrossmintService {
    private crossmintAPIHeaders: Record<string, string>;
    private crossmintBaseUrl: string;
    private static urlMap: Record<string, string> = {
        development: CROSSMINT_DEV_URL,
        staging: CROSSMINT_STG_URL,
        production: CROSSMINT_PROD_URL,
    };

    constructor(apiKey: string) {
        const result = validateAPIKey(apiKey);
        if (!result.isValid) {
            throw new Error("API key invalid");
        }
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": apiKey,
        };
        this.crossmintBaseUrl = this.getUrlFromEnv(result.environment);
    }

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

    private getUrlFromEnv(environment: string) {
        const url = CrossmintService.urlMap[environment];
        if (!url) {
            console.log(" CrossmintService.urlMap: ", CrossmintService.urlMap);
            throw new Error(`URL not found for environment: ${environment}`);
        }
        return url;
    }
}
