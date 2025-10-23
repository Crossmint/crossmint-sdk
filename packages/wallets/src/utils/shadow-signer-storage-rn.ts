import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ShadowSignerData, ShadowSignerStorage } from "./shadow-signer";

export class ReactNativeShadowSignerStorage implements ShadowSignerStorage {
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
        const db = await this.openDB();
        const tx = db.transaction([this.SHADOW_SIGNER_DB_STORE], "readwrite");
        const store = tx.objectStore(this.SHADOW_SIGNER_DB_STORE);
        store.delete(walletAddress);

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async storeMetadata(walletAddress: string, data: ShadowSignerData): Promise<void> {
        await AsyncStorage.setItem(`${this.SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`, JSON.stringify(data));
    }

    async getMetadata(walletAddress: string): Promise<ShadowSignerData | null> {
        try {
            const stored = await AsyncStorage.getItem(`${this.SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn("Failed to retrieve metadata from AsyncStorage:", error);
            return null;
        }
    }
}
