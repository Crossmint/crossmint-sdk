import { Crossmint } from "@/Crossmint/Crossmint";
import { environmentToCrossmintBaseURL } from "@/apiKey/utils/environmentToCrossmintBaseURL";
import { ValidateApiKeySuccessResult, validateAPIKey } from "@/apiKey/validateAPIKey";
import { ValidateAPIKeyPrefixExpectations } from "@/apiKey/validateAPIKeyPrefix";

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
        super({
            "x-api-key": crossmint.apiKey,
            ...(crossmint.jwt ? { Authorization: `Bearer ${crossmint.jwt}` } : {}),
        });
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
}
