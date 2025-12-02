import type { APIKeyEnvironmentPrefix } from "../types";
import { validateAPIKeyPrefix } from "../validateAPIKeyPrefix";

/**
 * Detects the environment from an API key
 */
export function detectEnvironmentFromApiKey(apiKey?: string): APIKeyEnvironmentPrefix | undefined {
    if (apiKey == null) {
        return undefined;
    }
    const apiKeyValidation = validateAPIKeyPrefix(apiKey);
    if (apiKeyValidation.isValid) {
        return apiKeyValidation.environment;
    }
    return undefined;
}
