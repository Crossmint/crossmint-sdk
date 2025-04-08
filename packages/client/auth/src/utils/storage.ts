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
        const cookie = document.cookie.split("; ").find((row) => row.startsWith(key));
        return cookie ? cookie.split("=")[1] : undefined;
    }

    // biome-ignore lint/suspicious/useAwait: The interface requires a Promise
    async set(key: string, value: string, expiresAt?: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        const expiresInUtc = expiresAt ? new Date(expiresAt).toUTCString() : "";
        document.cookie = `${key}=${value}; ${expiresAt ? `expires=${expiresInUtc};` : ""} path=/; SameSite=Lax;`;
    }

    // biome-ignore lint/suspicious/useAwait: The interface requires a Promise
    async remove(key: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
}

export function getDefaultStorageProvider(): StorageProvider {
    return new CookieStorage();
}
