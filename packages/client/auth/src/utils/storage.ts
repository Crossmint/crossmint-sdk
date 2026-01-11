import { validateAPIKey } from "@crossmint/common-sdk-base";
import { REFRESH_TOKEN_PREFIX } from "@crossmint/common-sdk-auth";
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
 * Extracts the project ID from an API key for cookie scoping.
 * This ensures each project has its own JWT storage to prevent audience mismatch issues.
 * Falls back to "default" if the API key is invalid or missing.
 */
export function getProjectIdFromApiKey(apiKey: string | undefined | null): string {
    if (apiKey == null) {
        return "default";
    }
    try {
        const result = validateAPIKey(apiKey);
        if (result.isValid) {
            return result.projectId;
        }
        return "default";
    } catch {
        return "default";
    }
}

/**
 * Cookie storage that scopes cookies by project ID.
 * This prevents JWT conflicts when switching between different projects.
 *
 * For JWTs: Only reads from scoped cookies to prevent using wrong project's JWT.
 * For refresh tokens: Falls back to legacy cookies to allow migration.
 * If a legacy refresh token is used with the wrong project, the server will reject it
 * and the SDK will call logout(), cleaning up the legacy cookie.
 */
export class ScopedCookieStorage implements StorageProvider {
    private projectId: string;

    constructor(apiKey: string) {
        this.projectId = getProjectIdFromApiKey(apiKey);
    }

    private getScopedKey(key: string): string {
        return `${key}-${this.projectId}`;
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
        // Only fall back to legacy cookies for refresh tokens, not JWTs.
        // This prevents using a JWT from the wrong project (which causes audience mismatch warnings).
        // For refresh tokens, if the legacy token is for a different project, the server will reject
        // the refresh attempt and the SDK will call logout(), cleaning up the legacy cookie.
        if (key === REFRESH_TOKEN_PREFIX) {
            return await getCookie(key);
        }
        return undefined;
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
        // Remove scoped cookie (also remove legacy cookie for cleanup during logout)
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
