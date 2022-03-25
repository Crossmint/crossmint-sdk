import { baseUrls } from "../models/types";

export const getEnvironmentBaseUrl = (environment = ""): string => {
    if (environment === "staging") return baseUrls.staging;
    if (environment === "prod" || !environment) return baseUrls.prod;
    return environment;
};
