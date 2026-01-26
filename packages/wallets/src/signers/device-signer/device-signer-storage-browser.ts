import type { DeviceSignerData, DeviceSignerStorage } from "./utils";

export class BrowserDeviceSignerStorage implements DeviceSignerStorage {
    private readonly DEVICE_SIGNER_DB_NAME = "crossmint_shadow_keys";
    private readonly DEVICE_SIGNER_DB_STORE = "keys";
    private readonly DEVICE_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";

    private async openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DEVICE_SIGNER_DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.DEVICE_SIGNER_DB_STORE)) {
                    db.createObjectStore(this.DEVICE_SIGNER_DB_STORE);
                }
            };
        });
    }

    async keyGenerator(): Promise<string> {
        const keyPair = (await window.crypto.subtle.generateKey(
            {
                name: "Ed25519",
                namedCurve: "Ed25519",
            } as AlgorithmIdentifier,
            false,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const publicKeyBuffer = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
        const publicKeyBytes = new Uint8Array(publicKeyBuffer);
        const publicKeyBase64 = Buffer.from(publicKeyBytes).toString("base64");

        await this.storePrivateKeyByPublicKey(publicKeyBase64, keyPair.privateKey);

        return publicKeyBase64;
    }

    async sign(publicKeyBase64: string, data: Uint8Array): Promise<Uint8Array> {
        const privateKey = await this.getPrivateKeyByPublicKey(publicKeyBase64);
        if (privateKey == null) {
            throw new Error(`No private key found for public key: ${publicKeyBase64}`);
        }

        const signature = await window.crypto.subtle.sign({ name: "Ed25519" }, privateKey, data as BufferSource);

        return new Uint8Array(signature);
    }

    private async storePrivateKeyByPublicKey(publicKey: string, privateKey: CryptoKey): Promise<void> {
        if (typeof indexedDB === "undefined") {
            return;
        }

        const db = await this.openDB();
        const tx = db.transaction([this.DEVICE_SIGNER_DB_STORE], "readwrite");
        const store = tx.objectStore(this.DEVICE_SIGNER_DB_STORE);
        store.put(privateKey, publicKey);

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    private async getPrivateKeyByPublicKey(publicKey: string): Promise<CryptoKey | null> {
        if (typeof indexedDB === "undefined") {
            return null;
        }

        try {
            const db = await this.openDB();
            const tx = db.transaction([this.DEVICE_SIGNER_DB_STORE], "readonly");
            const store = tx.objectStore(this.DEVICE_SIGNER_DB_STORE);
            const request = store.get(publicKey);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.warn("Failed to retrieve private key from IndexedDB:", error);
            return null;
        }
    }

    storeMetadata(walletAddress: string, data: DeviceSignerData): Promise<void> {
        if (typeof localStorage === "undefined") {
            return Promise.resolve();
        }

        localStorage.setItem(`${this.DEVICE_SIGNER_STORAGE_KEY}_${walletAddress}`, JSON.stringify(data));
        return Promise.resolve();
    }

    getMetadata(walletAddress: string): Promise<DeviceSignerData | null> {
        if (typeof localStorage === "undefined") {
            return Promise.resolve(null);
        }

        try {
            const stored = localStorage.getItem(`${this.DEVICE_SIGNER_STORAGE_KEY}_${walletAddress}`);
            return Promise.resolve(stored ? JSON.parse(stored) : null);
        } catch (error) {
            console.warn("Failed to retrieve metadata from localStorage:", error);
            return Promise.resolve(null);
        }
    }
}
