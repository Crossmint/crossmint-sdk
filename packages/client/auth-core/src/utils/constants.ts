// testing purposes
export const CROSSMINT_STG_URL = "http://localhost:3000";
// export const CROSSMINT_STG_URL = "https://staging.crossmint.com";
export const CROSSMINT_PROD_URL = "https://www.crossmint.com";

export const CrossmintEnvironment = {
    // DEVELOPMENT: "development" // uncomment when developing
    STAGING: "staging",
    PRODUCTION: "production",
} as const;
export type CrossmintEnvironment = (typeof CrossmintEnvironment)[keyof typeof CrossmintEnvironment];
