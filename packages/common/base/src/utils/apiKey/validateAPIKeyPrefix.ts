import { APIKeyEnvironmentPrefix, APIKeyPrefix, APIKeyUsageOrigin, APIKeyUsageOriginPrefix } from "./types";
import { usageOriginToPrefix } from "./utils";

export type ValidateAPIKeyPrefixResult =
    | ({
          isValid: true;
      } & ValidateAPIKeyPrefixSuccessData)
    | {
          isValid: false;
          message: string;
      };

export type ValidateAPIKeyPrefixSuccessData = {
    usageOrigin: APIKeyUsageOrigin;
    environment: APIKeyEnvironmentPrefix;
    prefix: APIKeyPrefix;
};

export type ValidateAPIKeyPrefixExpectations = {
    usageOrigin?: APIKeyUsageOrigin;
    environment?: APIKeyEnvironmentPrefix;
};

export function validateAPIKeyPrefix(
    apiKey: string,
    expectations?: ValidateAPIKeyPrefixExpectations
): ValidateAPIKeyPrefixResult {
    if (isOldAPIKey(apiKey)) {
        return {
            isValid: false,
            message: "Old API key format detected. Please create a new API key from the Crossmint console.",
        };
    }

    const usageOrigin = getUsageOriginForKey(apiKey);
    if (usageOrigin == null) {
        return {
            isValid: false,
            message: `Malformed API key. Must start with '${APIKeyUsageOriginPrefix.CLIENT}' or '${APIKeyUsageOriginPrefix.SERVER}'.`,
        };
    }
    if (expectations?.usageOrigin != null && usageOrigin !== expectations.usageOrigin) {
        return {
            isValid: false,
            message: `Disallowed API key. You passed a ${usageOrigin} API key, but a ${expectations.usageOrigin} API key is required.`,
        };
    }

    const environment = getEnvironmentForKey(apiKey);
    if (environment == null) {
        return {
            isValid: false,
            message: `Malformed API key. Must have a valid environment: '${APIKeyEnvironmentPrefix.DEVELOPMENT}', '${APIKeyEnvironmentPrefix.STAGING}' or '${APIKeyEnvironmentPrefix.PRODUCTION}'.`,
        };
    }
    if (expectations?.environment != null && environment !== expectations.environment) {
        return {
            isValid: false,
            message: `Disallowed API key. You passed a ${environment} API key, but a ${expectations.environment} API key is required.`,
        };
    }

    return {
        isValid: true,
        usageOrigin,
        environment,
        prefix: `${usageOriginToPrefix(usageOrigin)}_${environment}`,
    };
}

function isOldAPIKey(apiKey: string) {
    return apiKey.startsWith("sk_live") || apiKey.startsWith("sk_test");
}

function getUsageOriginForKey(apiKey: string): APIKeyUsageOrigin | null {
    if (apiKey.startsWith(APIKeyUsageOriginPrefix.CLIENT + "_")) {
        return APIKeyUsageOrigin.CLIENT;
    } else if (apiKey.startsWith(APIKeyUsageOriginPrefix.SERVER + "_")) {
        return APIKeyUsageOrigin.SERVER;
    }
    return null;
}

function getEnvironmentForKey(apiKey: string): APIKeyEnvironmentPrefix | null {
    const keyWithoutUsageOrigin = apiKey.slice(3)
    if (keyWithoutUsageOrigin.startsWith(APIKeyEnvironmentPrefix.DEVELOPMENT + "_")) {
        return APIKeyEnvironmentPrefix.DEVELOPMENT;
    } else if (keyWithoutUsageOrigin.startsWith(APIKeyEnvironmentPrefix.STAGING + "_")) {
        return APIKeyEnvironmentPrefix.STAGING;
    } else if (keyWithoutUsageOrigin.startsWith(APIKeyEnvironmentPrefix.PRODUCTION + "_")) {
        return APIKeyEnvironmentPrefix.PRODUCTION;
    }
    return null;
}
