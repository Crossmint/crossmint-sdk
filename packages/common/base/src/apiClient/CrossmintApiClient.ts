import { validateAPIKey } from "@/apiKey/validateAPIKey";
import { ValidateAPIKeyPrefixExpectations, ValidateAPIKeyPrefixSuccessResult } from "@/apiKey/validateAPIKeyPrefix";

import { ApiClient } from "./ApiClient";

export type CrossmintApiClientCtorParams = {
    apiKey: string;
    expectations?: ValidateAPIKeyPrefixExpectations;
    overrideBaseUrl?: string;
};

export class CrossmintApiClient extends ApiClient {
    protected parsedAPIKey: ValidateAPIKeyPrefixSuccessResult;
    protected overrideBaseUrl?: string;

    constructor({ apiKey, expectations, overrideBaseUrl }: CrossmintApiClientCtorParams) {
        const apiKeyValidationResult = validateAPIKey(apiKey, expectations);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        super({ "x-api-key": apiKey });
        this.parsedAPIKey = apiKeyValidationResult;
        this.overrideBaseUrl = overrideBaseUrl;
    }

    get baseUrl() {
        let url: string;
        if (this.overrideBaseUrl) {
            url = this.overrideBaseUrl;
        }

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

new CrossmintApiClient({ apiKey: "ck_prodc" }).get("path", { body: "" });
