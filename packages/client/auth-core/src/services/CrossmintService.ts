import { getEnvironmentForKey } from "@crossmint/common-sdk-base";

import { CROSSMINT_PROD_URL, CROSSMINT_STG_URL, type CrossmintEnvironment } from "../utils";

export interface CrossmintServiceBase {
    apiKey: string;
    crossmintBaseUrl: string;
    getJWKSUri(): string;
}

export interface CrossmintServiceWithToken extends CrossmintServiceBase {
    jwtToken: string;
}

export interface CrossmintServiceWithoutToken extends CrossmintServiceBase {
    jwtToken: string | null;
}

class CrossmintService implements CrossmintServiceBase {
    protected crossmintAPIHeaders: Record<string, string>;
    public readonly crossmintBaseUrl: string;
    private static urlMap: Record<CrossmintEnvironment, string> = {
        staging: CROSSMINT_STG_URL,
        production: CROSSMINT_PROD_URL,
    };

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

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class CrossmintServiceFactory {
    static create(apiKey: string, jwtToken: string): CrossmintServiceWithToken;
    static create(apiKey: string, jwtToken: null): CrossmintServiceWithoutToken;
    static create(apiKey: string, jwtToken: string | null): CrossmintServiceWithoutToken;
    static create(apiKey: string, jwtToken: string | null): CrossmintServiceWithoutToken {
        if (jwtToken == null) {
            return new CrossmintService(apiKey, jwtToken) as CrossmintServiceWithoutToken;
        }

        return new CrossmintService(apiKey, jwtToken) as CrossmintServiceWithToken;
    }
}
