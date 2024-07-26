import { validateAPIKey } from "@/apiKey/validateAPIKey";
import { ValidateAPIKeyPrefixExpectations, ValidateAPIKeyPrefixSuccessResult } from "@/apiKey/validateAPIKeyPrefix";

import { environmentToCrossmintBaseURL } from "../apiKey/utils/environmentToCrossmintBaseURL";
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
            return ApiClient.normalizePath(this.overrideBaseUrl);
        }
        const baseUrl = environmentToCrossmintBaseURL(this.parsedAPIKey.environment);
        return ApiClient.normalizePath(baseUrl);
    }
}
