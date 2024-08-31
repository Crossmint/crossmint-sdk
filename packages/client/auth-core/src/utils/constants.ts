export const CROSSMINT_STG_URL = "https://staging.crossmint.com";
export const CROSSMINT_PROD_URL = "https://www.crossmint.com";

export const CrossmintEnvironment = {
    STAGING: "staging",
    PRODUCTION: "production",
} as const;
export type CrossmintEnvironment = (typeof CrossmintEnvironment)[keyof typeof CrossmintEnvironment];

export const AUTH_SERVICE = "AUTH_SDK";
