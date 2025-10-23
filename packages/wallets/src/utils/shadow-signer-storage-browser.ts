import type { ShadowSignerData, ShadowSignerStorage } from "./shadow-signer";

export class BrowserShadowSignerStorage implements ShadowSignerStorage {
    private readonly SHADOW_SIGNER_DB_NAME = "crossmint_shadow_keys";
    private readonly SHADOW_SIGNER_DB_STORE = "keys";
    private readonly SHADOW_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";

    private async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.SHADOW_SIGNER_DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.SHADOW_SIGNER_DB_STORE)) {
                    db.createObjectStore(this.SHADOW_SIGNER_DB_STORE);
                }
            };
        });
    }

    async storePrivateKey(walletAddress: string, privateKey: CryptoKey): Promise<void> {
        if (typeof indexedDB === "undefined") {
            return;
        }

        const db = await this.openDB();
        const tx = db.transaction([this.SHADOW_SIGNER_DB_STORE], "readwrite");
        const store = tx.objectStore(this.SHADOW_SIGNER_DB_STORE);
        store.put(privateKey, walletAddress);

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getPrivateKey(walletAddress: string): Promise<CryptoKey | null> {
        if (typeof indexedDB === "undefined") {
            return null;
        }

        try {
            const db = await this.openDB();
            const tx = db.transaction([this.SHADOW_SIGNER_DB_STORE], "readonly");
            const store = tx.objectStore(this.SHADOW_SIGNER_DB_STORE);
            const request = store.get(walletAddress);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn("Failed to retrieve private key from IndexedDB:", error);
            return null;
        }
    }

    async removePrivateKey(walletAddress: string): Promise<void> {
        if (typeof indexedDB === "undefined") {
            return;
        }

        const db = await this.openDB();
        const tx = db.transaction([this.SHADOW_SIGNER_DB_STORE], "readwrite");
        const store = tx.objectStore(this.SHADOW_SIGNER_DB_STORE);
        store.delete(walletAddress);

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    storeMetadata(walletAddress: string, data: ShadowSignerData): Promise<void> {
        if (typeof localStorage === "undefined") {
            return Promise.resolve();
        }

        localStorage.setItem(`${this.SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`, JSON.stringify(data));
        return Promise.resolve();
    }

    getMetadata(walletAddress: string): Promise<ShadowSignerData | null> {
        if (typeof localStorage === "undefined") {
            return Promise.resolve(null);
        }

        try {
            const stored = localStorage.getItem(`${this.SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`);
            return Promise.resolve(stored ? JSON.parse(stored) : null);
        } catch (error) {
            console.warn("Failed to retrieve metadata from localStorage:", error);
            return Promise.resolve(null);
        }
    }
}
