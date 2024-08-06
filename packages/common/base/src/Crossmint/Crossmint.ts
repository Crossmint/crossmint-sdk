import { ValidateApiKeySuccessData, validateAPIKey } from "@/apiKey";

export type CrossmintConfig = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
};

export class Crossmint {
    private parsedApiKey: ValidateApiKeySuccessData;

    constructor(private config: CrossmintConfig) {
        const apiKeyValidationResult = validateAPIKey(config.apiKey);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        this.parsedApiKey = apiKeyValidationResult;
    }

    get apiKey() {
        return this.config.apiKey;
    }

    get jwt() {
        return this.config.jwt;
    }

    get overrideBaseUrl() {
        return this.config.overrideBaseUrl;
    }

    get projectId() {
        return this.parsedApiKey.projectId;
    }

    public updateConfig(newConfig: CrossmintConfig) {
        const apiKeyValidationResult = validateAPIKey(newConfig.apiKey);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        this.config.apiKey = newConfig.apiKey;
        this.parsedApiKey = apiKeyValidationResult;

        this.config.jwt = newConfig.jwt;
        this.config.overrideBaseUrl = newConfig.overrideBaseUrl;
    }
}
