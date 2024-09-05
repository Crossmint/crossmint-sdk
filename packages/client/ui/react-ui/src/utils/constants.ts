export const CROSSMINT_STG_URL = "http://localhost:3000";
export const CROSSMINT_PROD_URL = "https://www.crossmint.com";

export const CrossmintEnvironment = {
    STAGING: "staging",
    PRODUCTION: "production",
} as const;
export type CrossmintEnvironment = (typeof CrossmintEnvironment)[keyof typeof CrossmintEnvironment];

export const AUTH_SERVICE = "AUTH_SDK";
export const SESSION_PREFIX = "crossmint-session";
