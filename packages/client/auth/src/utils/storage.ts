import { deleteCookie, getCookie, setCookie } from "./cookies";

export interface StorageProvider {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string, expiresAt?: string): Promise<void>;
    remove(key: string): Promise<void>;
}

export class CookieStorage implements StorageProvider {
    async get(key: string): Promise<string | undefined> {
        if (typeof document === "undefined") {
            return undefined;
        }
        return await getCookie(key);
    }

    async set(key: string, value: string, expiresAt?: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        return await setCookie(key, value, expiresAt);
    }

    async remove(key: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        return await deleteCookie(key);
    }
}

/**
 * Extracts the prefix from an API key (e.g., "ck_staging" from "ck_staging_xxx...")
 * Returns the first two underscore-separated parts of the API key
 */
export function getApiKeyPrefix(apiKey: string | undefined | null): string {
    if (apiKey == null) {
        return "default";
    }
    const parts = apiKey.split("_");
    if (parts.length >= 2) {
        return `${parts[0]}_${parts[1]}`;
    }
    return apiKey;
}

/**
 * Cookie storage that scopes cookies by API key prefix.
 * This prevents JWT conflicts when switching between different projects.
 * For backward compatibility, it reads from legacy (unscoped) cookies as fallback.
 */
export class ScopedCookieStorage implements StorageProvider {
    private apiKeyPrefix: string;

    constructor(apiKey: string) {
        this.apiKeyPrefix = getApiKeyPrefix(apiKey);
    }

    private getScopedKey(key: string): string {
        return `${key}-${this.apiKeyPrefix}`;
    }

    async get(key: string): Promise<string | undefined> {
        if (typeof document === "undefined") {
            return undefined;
        }
        // First try the scoped cookie
        const scopedValue = await getCookie(this.getScopedKey(key));
        if (scopedValue != null) {
            return scopedValue;
        }
        // Fall back to legacy (unscoped) cookie for backward compatibility
        return await getCookie(key);
    }

    async set(key: string, value: string, expiresAt?: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        // Always write to the scoped cookie
        return await setCookie(this.getScopedKey(key), value, expiresAt);
    }

    async remove(key: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        // Remove both scoped and legacy cookies to ensure clean logout
        await deleteCookie(this.getScopedKey(key));
        await deleteCookie(key);
    }
}

export function getDefaultStorageProvider(): StorageProvider {
    return new CookieStorage();
}

export function getScopedStorageProvider(apiKey: string): StorageProvider {
    return new ScopedCookieStorage(apiKey);
}
