import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { LIB_VERSION, SDK_NAME, WALLET_SDK_ROOT_ENDPOINT } from "../utils/constants";
import type { CreateWalletParams, Wallet } from "../types/wallet";

export class CrossmintWalletServerSDK {
    private apiClient: CrossmintApiClient;
    private defaultApiClientConfig = {
        headers: { "Content-Type": "application/json" },
    };

    private constructor(apiClient: CrossmintApiClient) {
        this.apiClient = apiClient;
    }

    public static from(crossmint: Crossmint): CrossmintWalletServerSDK {
        return new CrossmintWalletServerSDK(this.defaultApiClient(crossmint));
    }

    static defaultApiClient(crossmint: Crossmint): CrossmintApiClient {
        return new CrossmintApiClient(crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: LIB_VERSION,
                },
            },
        });
    }

    public async getOrCreateWallet(wallet: CreateWalletParams): Promise<Wallet> {
        try {
            const response = await this.apiClient.post(`${WALLET_SDK_ROOT_ENDPOINT}`, {
                ...this.defaultApiClientConfig,
                body: JSON.stringify(wallet),
            });
            if (!response.ok) {
                throw await response.text();
            }
            return await response.json();
        } catch (error) {
            throw new Error(
                `[CrossmintWalletSDK] Failed to get or create wallet: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    public async getWalletByLocator(locator: string): Promise<Wallet> {
        try {
            const response = await this.apiClient.get(
                `${WALLET_SDK_ROOT_ENDPOINT}/${locator}`,
                this.defaultApiClientConfig
            );
            if (!response.ok) {
                throw await response.text();
            }
            return await response.json();
        } catch (error) {
            throw new Error(
                `[CrossmintWalletSDK] Failed to get wallet: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }
}
