import { CrossmintServiceError } from "@/error";
import type { SDKLogger } from "@/utils/SDKLogger";

import { validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";

import type { APIErrorService } from "./APIErrorService";

// TODO: DEPRECATE AND REMOVE
export abstract class BaseCrossmintService {
    public crossmintAPIHeaders: Record<string, string>;
    crossmintBaseUrl: string;
    protected abstract apiErrorService: APIErrorService<string>;
    protected abstract logger: SDKLogger;

    constructor(apiKey: string) {
        this.crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(apiKey);
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": apiKey,
        };
    }

    protected async fetchCrossmintAPI(
        endpoint: string,
        options: { body?: string; method: string } = { method: "GET" },
        onServerErrorMessage: string,
        authToken?: string
    ) {
        const url = `${this.crossmintBaseUrl}api/${endpoint}`;
        const urlPath = new URL(url).pathname;
        return this.logger.logPerformance(
            "FETCH_CROSSMINT_API",
            async () => {
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
            { endpoint: urlPath }
        );
    }
}
