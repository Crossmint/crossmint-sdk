import { validateAPIKey } from "@crossmint/common-sdk-base";
import { REFRESH_TOKEN_PREFIX, SESSION_PREFIX } from "@crossmint/common-sdk-auth";
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
 * For reads: scoped cookies are checked first. For refresh tokens only,
 * falls back to legacy unscoped cookies so the token can be sent to the
 * server for validation. The caller (CrossmintAuthClient) is responsible
 * for verifying the JWT audience after refresh and calling
 * `deleteLegacyCookies()` to clean up the legacy cookies once the
 * audience has been verified.
 */
export class ScopedCookieStorage implements StorageProvider {
    private projectId: string;

    constructor(apiKey: string) {
        this.projectId = getProjectIdFromApiKey(apiKey);
    }

    public getProjectId(): string {
        return this.projectId;
    }

    private getScopedKey(key: string): string {
        return `${key}-${this.projectId}`;
    }

    async get(key: string): Promise<string | undefined> {
        if (typeof document === "undefined") {
            console.debug(`[ScopedCookieStorage] Skipping cookie read for "${key}" - document is undefined (SSR)`);
            return undefined;
        }
        // First try the scoped cookie
        const scopedValue = getCookie(this.getScopedKey(key));
        if (scopedValue != null) {
            return scopedValue;
        }
        // Only fall back to legacy cookies for refresh tokens, not JWTs.
        // The refresh token is sent to the server, which returns a JWT whose
        // audience is then verified by the caller before storing.
        if (key === REFRESH_TOKEN_PREFIX) {
            return getCookie(key);
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
        // Remove scoped cookie (also remove legacy cookie for cleanup)
        await deleteCookie(this.getScopedKey(key));
        await deleteCookie(key);
    }

    /**
     * Delete legacy unscoped cookies after a successful, verified refresh.
     * Called by CrossmintAuthClient once the JWT audience has been confirmed
     * to match the current project.
     */
    deleteLegacyCookies(): void {
        if (typeof document === "undefined") {
            return;
        }
        for (const key of [SESSION_PREFIX, REFRESH_TOKEN_PREFIX]) {
            // Only delete if the legacy cookie actually exists
            if (getCookie(key) != null) {
                deleteCookie(key);
            }
        }
    }
}

export function getDefaultStorageProvider(): StorageProvider {
    return new CookieStorage();
}

export function getScopedStorageProvider(apiKey: string): StorageProvider {
    return new ScopedCookieStorage(apiKey);
}
