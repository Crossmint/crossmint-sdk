import { getEnvironmentBaseUrl } from "@crossmint/client-sdk-base";
import { APIKeyUsageOrigin, validateAPIKey } from "@crossmint/common-sdk-base";

import { type ChainRPCConfig, type VCSDKConfig, configManager } from "./verifiableCredentialsSDK";

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

    public getBlockchainRpcs(): ChainRPCConfig {
        return this.getConfig().blockchainRpcs;
    }

    private getEnvironment(): string {
        if (!this.environment) {
            throw new Error("Environment not set");
        }
        return this.environment;
    }

    isProd() {
        return this.getEnvironment() === "prod" || this.getEnvironment() === "production";
    }

    public getHeaders(post = false) {
        if (!this.apiKey) {
            throw new Error("Credentials not set");
        }

        const headers = {
            "x-api-key": this.apiKey,
            accept: "application/json",
        };

        if (post) {
            return {
                ...headers,
                "Content-Type": "application/json",
            };
        }
        return headers;
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
        config: {
            environment: "staging" | "prod" | "production" | string;
            ipfsGateways?: string[];
            ipfsTimeout?: number;
            blockchainRpcs?: ChainRPCConfig;
        }
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

/**
 * Crossmint API singleton, used to init the SDK
 * To use the SDK you must call `init` before any other method
 * @example
 * ```typescript
 * crossmintAPI.init(
 *  "your-api-key",
 *  config: {
 *    environment: "staging",
 *    ipfsGateways: ["https://ipfs.io"], // Optional, a list of defualt ones is provided
 *    ipfsTimeout: 5000, // ms, Optional, default is 10 seconds
 *    blockchainRpcs: {...} // Optional, default rpcs for polygon are provided
 *  }
 * )
 */
export const crossmintAPI = CrossmintAPI.getInstance();
