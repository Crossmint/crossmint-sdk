import { APIKeyEnvironmentPrefix } from "../types";

export function environmentToCrossmintBaseURL(
    environment: APIKeyEnvironmentPrefix,
    customMap?: Partial<Record<APIKeyEnvironmentPrefix, string>>
): string {
    switch (environment) {
        case "development":
            return customMap?.development || "http://localhost:3000";
        case "staging":
            return customMap?.staging || "https://staging.crossmint.com";
        case "production":
            return customMap?.production || "https://www.crossmint.com";
    }
}
