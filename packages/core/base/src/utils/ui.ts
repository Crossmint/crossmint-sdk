import { baseUrls } from "../models/types";

export const getEnvironmentBaseUrl = (environment = ""): string => {
    const productionValues = ["prod", "production"];
    if (environment === "staging") return baseUrls.staging;
    if (productionValues.includes(environment) || !environment) return baseUrls.prod;
    return environment;
};
