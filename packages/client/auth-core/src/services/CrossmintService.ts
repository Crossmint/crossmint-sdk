import { getEnvironmentForKey } from "@crossmint/common-sdk-base";

import { CROSSMINT_PROD_URL, CROSSMINT_STG_URL, type CrossmintEnvironment } from "../utils";

export class CrossmintService {
    protected crossmintAPIHeaders: Record<string, string>;
    public readonly crossmintBaseUrl: string;
    private static urlMap: Record<CrossmintEnvironment, string> = {
        staging: CROSSMINT_STG_URL,
        production: CROSSMINT_PROD_URL,
    };

    public readonly issuer: string;

    constructor(public apiKey: string, public jwtToken: string | null) {
        this.crossmintAPIHeaders = {
            accept: "application/json",
            "content-type": "application/json",
            "x-api-key": apiKey,
        };

        this.crossmintBaseUrl =
            getEnvironmentForKey(apiKey) === "production"
                ? this.getUrlFromEnv("production")
                : this.getUrlFromEnv("staging");

        this.issuer =
            getEnvironmentForKey(apiKey) === "production"
                ? "https://www.crossmint.com"
                : "https://staging.crossmint.com";
    }

    protected getUrlFromEnv(environment: CrossmintEnvironment) {
        const url = CrossmintService.urlMap[environment];
        if (!url) {
            throw new Error(`URL not found for environment: ${environment}`);
        }
        return url;
    }

    public getJWKSUri() {
        return `${this.crossmintBaseUrl}/.well-known/jwks.json`;
    }
}
