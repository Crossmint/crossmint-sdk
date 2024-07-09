import { validateAPIKey } from "@crossmint/common-sdk-base";

import { CrossmintServiceError } from "../types/Error";
import { CROSSMINT_DEV_URL, CROSSMINT_PROD_URL, CROSSMINT_STG_URL } from "../utils/constants";
import { LoggerWrapper, logPerformance } from "../utils/log";

export abstract class BaseCrossmintService extends LoggerWrapper {
    protected crossmintAPIHeaders: Record<string, string>;
    protected crossmintBaseUrl: string;
    private static urlMap: Record<string, string> = {
        development: CROSSMINT_DEV_URL,
        staging: CROSSMINT_STG_URL,
        production: CROSSMINT_PROD_URL,
    };

    constructor(apiKey: string) {
        super("BaseCrossmintService");
        const result = validateAPIKey(apiKey);
        if (!result.isValid) {
            throw new Error("API key invalid");
        }
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": apiKey,
            credentials: "include",
        };
        this.crossmintBaseUrl = this.getUrlFromEnv(result.environment);
    }

    protected async fetchCrossmintAPI(
        endpoint: string,
        options: { body?: string; method: string } = { method: "GET" },
        onServerErrorMessage: string,
        authToken?: string
    ) {
        return logPerformance(
            "FETCH_CROSSMINT_API",
            async () => {
                const url = `${this.crossmintBaseUrl}/${endpoint}`;
                const { body, method } = options;

                let response: Response;
                try {
                    response = await fetch(url, {
                        body,
                        method,
                        headers: {
                            ...this.crossmintAPIHeaders,
                            ...(authToken != null && { Authorization: `Bearer ${authToken}` }),
                        },
                    });
                } catch (error) {
                    throw new CrossmintServiceError(`Error fetching Crossmint API: ${error}`);
                }

                if (!response.ok) {
                    // Crossmint throws a generic “An error occurred” error for all 5XX errors.
                    // We throw a more specific error depending on the endpoint that was called.
                    // We forward all 4XX errors. This includes rate limit errors.
                    // It also includes chain not found, as it is a bad request error.
                    const message = response.status >= 500 ? onServerErrorMessage : await response.text();
                    throw new CrossmintServiceError(message, response.status);
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
