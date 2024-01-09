export const APIKeyUsageOriginPrefix = {
    CLIENT: "ck",
    SERVER: "sk",
} as const;
export type APIKeyUsageOriginPrefix = (typeof APIKeyUsageOriginPrefix)[keyof typeof APIKeyUsageOriginPrefix];

export const APIKeyEnvironmentPrefix = {
    DEVELOPMENT: "development",
    STAGING: "staging",
    PRODUCTION: "production",
} as const;
export type APIKeyEnvironmentPrefix = (typeof APIKeyEnvironmentPrefix)[keyof typeof APIKeyEnvironmentPrefix];

export type APIKeyPrefix = `${APIKeyUsageOriginPrefix}_${APIKeyEnvironmentPrefix}`;

export const APIKeyUsageOrigin = {
    CLIENT: "client",
    SERVER: "server",
} as const;
export type APIKeyUsageOrigin = (typeof APIKeyUsageOrigin)[keyof typeof APIKeyUsageOrigin];
