import { APIKeyUsageOrigin, APIKeyUsageOriginPrefix } from "../types";

export function usageOriginToPrefix(usageOrigin: APIKeyUsageOrigin): APIKeyUsageOriginPrefix {
    return usageOrigin === "client" ? "ck" : "sk";
}
