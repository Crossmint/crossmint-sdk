import { CROSSMINT_PROD_URL, CROSSMINT_STG_URL, CrossmintEnvironment } from "../utils";

export type FetchCrossmintParams = {
    endpoint: string;
    options: {
        method: "GET" | "POST" | "PUT" | "DELETE";
        body?: any;
    };
    onServerErrorMessage?: string;
};

export class CrossmintService {
    protected crossmintAPIHeaders: Record<string, string>;
    public readonly crossmintBaseUrl: string;
    private static urlMap: Record<CrossmintEnvironment, string> = {
        staging: CROSSMINT_STG_URL,
        production: CROSSMINT_PROD_URL,
    };

    constructor(jwtToken: string, environment?: CrossmintEnvironment) {
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-jwt-auth": `Bearer ${jwtToken}`,
        };
        this.crossmintBaseUrl = this.getUrlFromEnv(environment ?? "production");
    }

    async fetchCrossmintAPI({ endpoint, options = { method: "GET" }, onServerErrorMessage }: FetchCrossmintParams) {
        const url = `${this.crossmintBaseUrl}/api/${endpoint}`;
        const { body, method } = options;

        try {
            const response = await fetch(url, {
                body: body ? JSON.stringify(body) : undefined,
                method,
                headers: this.crossmintAPIHeaders,
            });
            if (!response.ok) {
                // We forward all 4XX errors. This includes rate limit errors.
                // It also includes chain not found, as it is a bad request error.
                throw new Error(onServerErrorMessage ?? (await response.text()));
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching Crossmint API: ", error);
            throw new Error(`Error fetching Crossmint API: ${error}`);
        }
    }

    protected getUrlFromEnv(environment: CrossmintEnvironment) {
        const url = CrossmintService.urlMap[environment];
        if (!url) {
            throw new Error(`URL not found for environment: ${environment}`);
        }
        return url;
    }
}
