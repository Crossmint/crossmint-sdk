import { environmentToCrossmintBaseURL } from "@/apiKey/utils/environmentToCrossmintBaseURL";
import { type ValidateApiKeySuccessResult, validateAPIKey } from "@/apiKey/validateAPIKey";
import type { ValidateAPIKeyPrefixExpectations } from "@/apiKey/validateAPIKeyPrefix";
import type { Crossmint } from "@/types/Crossmint";

import { ApiClient } from "./ApiClient";

export type CrossmintApiClientInternalConfig = {
    sdkMetadata: {
        name: string;
        version: string;
    };
    apiKeyExpectations?: ValidateAPIKeyPrefixExpectations;
};

export class CrossmintApiClient extends ApiClient {
    protected parsedAPIKey: ValidateApiKeySuccessResult;
    protected internalConfig: CrossmintApiClientInternalConfig;

    constructor(
        public crossmint: Crossmint,
        {
            internalConfig,
        }: {
            internalConfig: CrossmintApiClientInternalConfig;
        }
    ) {
        const apiKeyValidationResult = validateAPIKey(crossmint.apiKey, internalConfig.apiKeyExpectations);
        if (!apiKeyValidationResult.isValid) {
            throw new Error(apiKeyValidationResult.message);
        }
        super();
        this.parsedAPIKey = apiKeyValidationResult;
        this.internalConfig = internalConfig;
    }

    get baseUrl() {
        if (this.crossmint.overrideBaseUrl) {
            return ApiClient.normalizePath(this.crossmint.overrideBaseUrl);
        }
        const baseUrl = environmentToCrossmintBaseURL(this.parsedAPIKey.environment);
        return ApiClient.normalizePath(baseUrl);
    }

    get authHeaders() {
        return {
            "x-api-key": this.crossmint.apiKey,
            ...(this.crossmint.jwt ? { Authorization: `Bearer ${this.crossmint.jwt}` } : {}),
        };
    }
}
