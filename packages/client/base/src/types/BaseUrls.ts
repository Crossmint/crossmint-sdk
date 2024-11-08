export const BaseUrls = {
    prod: "https://www.crossmint.com",
    staging: "https://staging.crossmint.com",
    dev: "http://localhost:3001",
} as const;
export type BaseUrls = (typeof BaseUrls)[keyof typeof BaseUrls];
