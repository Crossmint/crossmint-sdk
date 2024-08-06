import { ValidateApiKeySuccessData, ValidateApiKeySuccessResult, validateAPIKey } from "@/apiKey";

export type CrossmintConfig = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
};

export class Crossmint {
    private parsedApiKey: ValidateApiKeySuccessData;

    constructor(private config: CrossmintConfig) {
        const { apiKey, jwt, overrideBaseUrl } = config;

        const apiKeyValidationResult = validateAPIKey(apiKey);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        this.parsedApiKey = apiKeyValidationResult;

        this.apiKey = apiKey;
        this.jwt = jwt;
        this.overrideBaseUrl = overrideBaseUrl;
    }

    get apiKey() {
        return this.config.apiKey;
    }
    set apiKey(apiKey: string) {
        const apiKeyValidationResult = validateAPIKey(apiKey);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        this.parsedApiKey = apiKeyValidationResult;
        this.config.apiKey = apiKey;
    }

    get jwt() {
        return this.config.jwt;
    }
    set jwt(jwt: string | undefined) {
        this.config.jwt = jwt;
    }

    get overrideBaseUrl() {
        return this.config.overrideBaseUrl;
    }
    set overrideBaseUrl(overrideBaseUrl: string | undefined) {
        this.config.overrideBaseUrl = overrideBaseUrl;
    }

    get projectId() {
        return this.parsedApiKey.projectId;
    }
}
