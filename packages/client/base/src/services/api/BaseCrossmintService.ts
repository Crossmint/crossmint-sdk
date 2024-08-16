import { CrossmintServiceError } from "@/error";
import { SDKLogger } from "@/utils/SDKLogger";

import { validateAPIKey } from "@crossmint/common-sdk-base";

import { CROSSMINT_DEV_URL, CROSSMINT_PROD_URL, CROSSMINT_STG_URL } from "../../consts";
import { APIErrorService } from "./APIErrorService";

export abstract class BaseCrossmintService {
    public crossmintAPIHeaders: Record<string, string>;
    protected crossmintBaseUrl: string;
    protected abstract apiErrorService: APIErrorService<string>;
    protected abstract logger: SDKLogger;
    private static urlMap: Record<string, string> = {
        development: CROSSMINT_DEV_URL,
        staging: CROSSMINT_STG_URL,
        production: CROSSMINT_PROD_URL,
    };

    constructor(apiKey: string) {
        const result = validateAPIKey(apiKey);
        if (!result.isValid) {
            throw new Error("API key invalid");
        }
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": apiKey,
        };
        this.crossmintBaseUrl = this.getUrlFromEnv(result.environment);
    }

    protected async fetchCrossmintAPI(
        endpoint: string,
        options: { body?: string; method: string } = { method: "GET" },
        onServerErrorMessage: string,
        authToken?: string
    ) {
        return this.logger.logPerformance(
            "FETCH_CROSSMINT_API",
            async () => {
                const url = `${this.crossmintBaseUrl}/api/${endpoint}`;
                const { body, method } = options;

                let response: Response;
                try {
                    response = await fetch(url, {
                        body,
                        method,
                        headers: {
                            ...this.crossmintAPIHeaders,
                            ...(authToken != null && {
                                Authorization: `Bearer ${authToken}`,
                            }),
                        },
                    });
                } catch (error) {
                    throw new CrossmintServiceError(`Error fetching Crossmint API: ${error}`);
                }

                if (!response.ok) {
                    await this.apiErrorService.throwErrorFromResponse({
                        response,
                        onServerErrorMessage,
                    });
                }

                return await response.json();
            },
            { endpoint }
        );
    }

    protected getUrlFromEnv(environment: string) {
        const url = BaseCrossmintService.urlMap[environment];
        if (!url) {
            console.log(" CrossmintService.urlMap: ", BaseCrossmintService.urlMap);
            throw new Error(`URL not found for environment: ${environment}`);
        }
        return url;
    }
}
