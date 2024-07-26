import { validateAPIKey } from "@/apiKey/validateAPIKey";
import { ValidateAPIKeyPrefixExpectations, ValidateAPIKeyPrefixSuccessResult } from "@/apiKey/validateAPIKeyPrefix";

import { ApiClient } from "./ApiClient";

export type CrossmintApiClientCtorParams = CrossmintApiClientCtorWithoutExpectationsParams & {
    expectations?: ValidateAPIKeyPrefixExpectations;
};

export type CrossmintApiClientCtorWithoutExpectationsParams = {
    apiKey: string;
    overrideBaseUrl?: string;
    extraAuthHeaders?: HeadersInit;
};

export class CrossmintApiClient extends ApiClient {
    protected parsedAPIKey: ValidateAPIKeyPrefixSuccessResult;
    protected overrideBaseUrl?: string;

    constructor({ apiKey, expectations, overrideBaseUrl, extraAuthHeaders }: CrossmintApiClientCtorParams) {
        const apiKeyValidationResult = validateAPIKey(apiKey, expectations);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        super({ "x-api-key": apiKey, ...extraAuthHeaders });
        this.parsedAPIKey = apiKeyValidationResult;
        this.overrideBaseUrl = overrideBaseUrl;
    }

    get baseUrl() {
        if (this.overrideBaseUrl) {
            return CrossmintApiClient.normalizePath(this.overrideBaseUrl);
        }

        let url: string;
        const { environment } = this.parsedAPIKey;
        switch (environment) {
            case "production":
                url = "https://www.crossmint.com";
                break;
            case "staging":
                url = "https://staging.crossmint.com";
                break;
            case "development":
                url = "http://localhost:3000";
                break;
            default:
                throw new Error(`[CrossmintApiClient.baseUrl()] Unknown environment: ${environment}`);
        }

        return CrossmintApiClient.normalizePath(url);
    }
}
