function webviewStorageInjectedCode() {
    const DB_NAME = "crossmint_shadow_keys";
    const STORE_NAME = "keys";
    let db: IDBDatabase | null = null;

    // Open IndexedDB
    async function openDB(): Promise<IDBDatabase> {
        if (db) {
            return db;
        }
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    openDB()
        .then(() => {
            console.log("[CrossmintShadowSigner] IndexedDB ready for non-extractable key storage");
        })
        .catch((e) => {
            console.error("[CrossmintShadowSigner] IndexedDB init failed:", e);
        });

    (window as unknown as Record<string, unknown>).__crossmintShadowSignerStorage = async function (
        operation: string,
        params: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        try {
            await openDB();
            let result: Record<string, unknown>;

            switch (operation) {
                case "generate": {
                    console.log("[CrossmintShadowSigner] Generating new Ed25519 key pair (non-extractable)...");

                    const keyPair = (await crypto.subtle.generateKey(
                        { name: "Ed25519", namedCurve: "Ed25519" } as EcKeyGenParams,
                        false,
                        ["sign", "verify"]
                    )) as CryptoKeyPair;

                    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
                    const publicKeyBytes = new Uint8Array(publicKeyBuffer);

                    const publicKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(publicKeyBytes)));

                    console.log(
                        "[CrossmintShadowSigner] Key pair generated, storing in IndexedDB with public key as index..."
                    );

                    if (!db) {
                        throw new Error("Database not initialized");
                    }
                    const tx = db.transaction([STORE_NAME], "readwrite");
                    tx.objectStore(STORE_NAME).put(keyPair.privateKey, publicKeyBase64);
                    await new Promise<void>((resolve, reject) => {
                        tx.oncomplete = () => {
                            resolve();
                        };
                        tx.onerror = () => {
                            reject(tx.error);
                        };
                    });

                    console.log("[CrossmintShadowSigner] Private key stored in IndexedDB[publicKey]");
                    console.log("[CrossmintShadowSigner] ✅ Key generation complete");

                    result = { publicKeyBytes: Array.from(publicKeyBytes) };
                    break;
                }

                case "sign": {
                    const { publicKey, messageBytes } = params;

                    console.log("[CrossmintShadowSigner] Retrieving key from IndexedDB for signing...");

                    if (!db) {
                        throw new Error("Database not initialized");
                    }
                    const tx = db.transaction([STORE_NAME], "readonly");
                    const request = tx.objectStore(STORE_NAME).get(publicKey as string);
                    const privateKey = await new Promise<CryptoKey>((resolve, reject) => {
                        request.onsuccess = () => {
                            resolve(request.result);
                        };
                        request.onerror = () => {
                            reject(request.error);
                        };
                    });

                    if (!privateKey) {
                        throw new Error("Private key not found for public key: " + publicKey);
                    }

                    console.log("[CrossmintShadowSigner] Key retrieved, signing...");

                    const signature = await crypto.subtle.sign(
                        { name: "Ed25519" } as AlgorithmIdentifier,
                        privateKey,
                        new Uint8Array(messageBytes as number[])
                    );

                    console.log("[CrossmintShadowSigner] ✅ Signing complete");
                    result = { signatureBytes: Array.from(new Uint8Array(signature)) };
                    break;
                }

                default:
                    throw new Error("Unknown operation: " + operation);
            }

            return result;
        } catch (error) {
            console.error("[CrossmintShadowSigner] Operation failed:", operation, error);
            throw error;
        }
    };

    console.log("[CrossmintShadowSigner] Storage handler installed in WebView");
}

// Convert function to string and wrap as IIFE
// The 'true;' at the end is required by React Native WebView's injectJavaScript
export const SHADOW_SIGNER_STORAGE_INJECTED_JS = `(${webviewStorageInjectedCode.toString()})();\ntrue;`;
