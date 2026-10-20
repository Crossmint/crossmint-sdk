import { WithLoggerContext } from "@crossmint/common-sdk-base";
import { decodeBase64, encodeBase64, encodeHex } from "@crossmint/client-signers-cryptography";
import { DeviceSignerKeyStorage } from "./DeviceSignerKeyStorage";
import { walletsLogger } from "../../logger";
import { getDeviceName } from "./device-name";

const DB_NAME = "crossmint-device-signer";
const DB_VERSION = 1;
const KEYS_STORE = "keys";
const ADDRESS_MAP_STORE = "address-map";

/**
 * DeviceSignerKeyStorage backed by the IndexedDB of the page's own origin.
 *
 * Use it in browsers that delete the storage of iframes from another origin when the browser
 * closes (Safari, every iOS browser, and Brave), where {@link IframeDeviceSignerKeyStorage}
 * loses the key after a restart. Keys are non-extractable Web Crypto keys: page scripts can
 * sign with them, but cannot read or export the private key.
 *
 * Supports only the `"none"` biometric policy.
 */
export class IndexedDbDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private dbPromise: Promise<IDBDatabase> | null = null;

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.generateKey",
    })
    async generateKey(
        params: Parameters<DeviceSignerKeyStorage["generateKey"]>[0] = { biometricPolicy: "none" }
    ): Promise<string> {
        if (params.biometricPolicy != null && params.biometricPolicy !== "none") {
            throw new Error(`Biometric policy "${params.biometricPolicy}" is not supported by this key storage`);
        }

        if (params.address != null) {
            const existing = await this.getKey(params.address);
            if (existing != null) {
                return existing;
            }
        }

        const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, [
            "sign",
            "verify",
        ]);
        const publicKeyBase64 = await exportPublicKeyBase64(keyPair.publicKey);

        const db = await this.getDb();
        const tx = db.transaction([KEYS_STORE, ADDRESS_MAP_STORE], "readwrite");
        tx.objectStore(KEYS_STORE).put(keyPair, publicKeyBase64);
        if (params.address != null) {
            tx.objectStore(ADDRESS_MAP_STORE).put(publicKeyBase64, params.address);
        }
        await transactionDone(tx);

        return publicKeyBase64;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.mapAddressToKey",
    })
    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        const existing = await this.getKey(address);
        if (existing === publicKeyBase64) {
            return;
        }
        if (existing != null) {
            throw new Error(`Address ${address} already has a different key stored`);
        }
        if ((await this.getKeyPair(publicKeyBase64)) == null) {
            throw new Error(`No key pair found for publicKey ${publicKeyBase64}`);
        }

        const db = await this.getDb();
        const tx = db.transaction(ADDRESS_MAP_STORE, "readwrite");
        tx.objectStore(ADDRESS_MAP_STORE).put(publicKeyBase64, address);
        await transactionDone(tx);
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.getKey",
    })
    async getKey(address: string): Promise<string | null> {
        const publicKeyBase64 = await this.get<string>(ADDRESS_MAP_STORE, address);
        if (publicKeyBase64 == null || (await this.getKeyPair(publicKeyBase64)) == null) {
            return null;
        }
        return publicKeyBase64;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.hasKey",
    })
    async hasKey(publicKeyBase64: string): Promise<boolean> {
        return (await this.getKeyPair(publicKeyBase64)) != null;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.signMessage",
    })
    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        const publicKeyBase64 = await this.getKey(address);
        const keyPair = publicKeyBase64 != null ? await this.getKeyPair(publicKeyBase64) : null;
        if (keyPair == null) {
            throw new Error(`No key pair found for address ${address}`);
        }

        const signature = await crypto.subtle.sign(
            { name: "ECDSA", hash: { name: "SHA-256" } },
            keyPair.privateKey,
            decodeBase64(message)
        );

        const sigBytes = new Uint8Array(signature);
        return {
            r: `0x${encodeHex(sigBytes.slice(0, 32))}`,
            s: `0x${encodeHex(sigBytes.slice(32, 64))}`,
        };
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.deleteKey",
    })
    async deleteKey(address: string): Promise<void> {
        const publicKeyBase64 = await this.get<string>(ADDRESS_MAP_STORE, address);
        const db = await this.getDb();
        const tx = db.transaction([KEYS_STORE, ADDRESS_MAP_STORE], "readwrite");
        tx.objectStore(ADDRESS_MAP_STORE).delete(address);
        if (publicKeyBase64 != null) {
            tx.objectStore(KEYS_STORE).delete(publicKeyBase64);
        }
        await transactionDone(tx);
    }

    getDeviceName(): string {
        return getDeviceName();
    }

    /** Close the database connection. A later call opens a new one. */
    destroy(): void {
        const dbPromise = this.dbPromise;
        this.dbPromise = null;
        dbPromise
            ?.then((db) => db.close())
            .catch(() => {
                /* noop */
            });
    }

    private async getKeyPair(publicKeyBase64: string): Promise<CryptoKeyPair | null> {
        return (await this.get<CryptoKeyPair>(KEYS_STORE, publicKeyBase64)) ?? null;
    }

    private async get<T>(storeName: string, key: string): Promise<T | undefined> {
        const db = await this.getDb();
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(key);
        await transactionDone(tx);
        return request.result as T | undefined;
    }

    private getDb(): Promise<IDBDatabase> {
        if (this.dbPromise == null) {
            this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = () => {
                    request.result.createObjectStore(KEYS_STORE);
                    request.result.createObjectStore(ADDRESS_MAP_STORE);
                };
                request.onsuccess = () => {
                    const db = request.result;
                    navigator.storage?.persist?.().catch(() => {
                        /* noop */
                    });
                    db.onclose = () => {
                        this.dbPromise = null;
                    };
                    resolve(db);
                };
                request.onerror = () => reject(request.error);
            }).catch((error) => {
                this.dbPromise = null;
                throw error;
            });
        }
        return this.dbPromise;
    }
}

function transactionDone(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    });
}

async function exportPublicKeyBase64(publicKey: CryptoKey): Promise<string> {
    const raw = await crypto.subtle.exportKey("raw", publicKey);
    return encodeBase64(new Uint8Array(raw));
}
