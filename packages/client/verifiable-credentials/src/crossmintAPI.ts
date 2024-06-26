import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";
import { APIKeyUsageOrigin, validateAPIKey } from "@crossmint/common-sdk-base";

import { ChainRPC, VCSDKConfig, configManager } from "./verifiableCredentialsSKD";

class CrossmintAPI {
    private apiKey?: string;
    private environment?: string;
    private static instance: CrossmintAPI;

    private constructor() {}

    public static getInstance(): CrossmintAPI {
        if (!CrossmintAPI.instance) {
            CrossmintAPI.instance = new CrossmintAPI();
        }
        return CrossmintAPI.instance;
    }

    public getConfig(): VCSDKConfig {
        return configManager.getConfig();
    }
    public getIpfsGateways(): string[] {
        return this.getConfig().ipfsGateways;
    }

    public getBlockchainRpcs(): ChainRPC[] {
        return this.getConfig().blockchainRpcs;
    }

    private getEnvironment(): string {
        if (!this.environment) {
            throw new Error("Environment not set");
        }
        return this.environment;
    }

    public getHeaders() {
        if (!this.apiKey) {
            throw new Error("Credentials not set");
        }

        return {
            "x-api-key": this.apiKey,
            accept: "application/json",
        };
    }

    public getBaseUrl() {
        const baseUrl = getEnvironmentBaseUrl(this.getEnvironment());
        return baseUrl;
    }

    public getOrigin() {
        if (typeof window !== "undefined") {
            return APIKeyUsageOrigin.CLIENT;
        } else if (typeof global !== "undefined") {
            return APIKeyUsageOrigin.SERVER;
        } else {
            console.error("Unknown environment, cannot determine API key usage origin, be careful!");
            return null;
        }
    }

    public init(
        apiKey: string,
        config: { environment: "staging" | "prod" | string; ipfsGateways?: string[]; blockchainRpcs?: ChainRPC[] }
    ) {
        this.apiKey = apiKey;
        this.environment = config.environment;

        const usageOrigin = this.getOrigin();
        if (usageOrigin != null) {
            const validationResult = validateAPIKey(apiKey, {
                usageOrigin: usageOrigin,
            });
            if (!validationResult.isValid) {
                console.warn(`API key invalid: ${validationResult.message}`);
            }
        }

        if (config.environment !== "prod" && config.environment !== "staging") {
            console.warn(
                `Using custom environment: ${config.environment}, you may want to use 'staging' or 'prod' instead`
            );
        }

        configManager.init(config);
    }
}

export const crossmintAPI = CrossmintAPI.getInstance();
