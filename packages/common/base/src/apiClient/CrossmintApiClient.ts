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
        this.crossmint.jwt = this.crossmint.jwt || this.crossmint.experimental_customAuth?.jwt;
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

    get commonHeaders() {
        return {
            "x-client-name": this.internalConfig.sdkMetadata.name,
            "x-client-version": this.internalConfig.sdkMetadata.version,
            "x-api-key": this.crossmint.apiKey,
            ...(this.crossmint.appId ? { "x-app-identifier": this.crossmint.appId } : {}),
            ...(this.crossmint.extensionId ? { "x-extension-id": this.crossmint.extensionId } : {}),
            ...(this.crossmint.jwt ? { Authorization: `Bearer ${this.crossmint.jwt}` } : {}),
        };
    }

    get environment() {
        return this.parsedAPIKey.environment;
    }
}
