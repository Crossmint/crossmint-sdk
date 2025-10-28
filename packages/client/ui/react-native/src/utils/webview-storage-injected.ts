// Plain JavaScript string - no function stringification
export const SHADOW_SIGNER_STORAGE_INJECTED_JS = `
(function() {
    console.log("[CrossmintShadowSigner] Starting injection...");
    
    var DB_NAME = "crossmint_shadow_keys";
    var STORE_NAME = "keys";
    var db = null;

    // Open IndexedDB
    function openDB() {
        if (db) {
            return Promise.resolve(db);
        }
        return new Promise(function(resolve, reject) {
            var request = indexedDB.open(DB_NAME, 1);
            request.onerror = function() { reject(request.error); };
            request.onsuccess = function() {
                db = request.result;
                resolve(db);
            };
            request.onupgradeneeded = function(event) {
                var database = event.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    openDB()
        .then(function() {
            console.log("[CrossmintShadowSigner] IndexedDB ready for non-extractable key storage");
        })
        .catch(function(e) {
            console.error("[CrossmintShadowSigner] IndexedDB init failed:", e);
        });

    window.__crossmintShadowSignerStorage = async function(operation, params) {
        console.log("[CrossmintShadowSigner] Function called with operation:", operation);
        try {
            await openDB();
            var result;

            switch (operation) {
                case "generate":
                    console.log("[CrossmintShadowSigner] Generating new Ed25519 key pair (non-extractable)...");

                    var keyPair = await crypto.subtle.generateKey(
                        { name: "Ed25519", namedCurve: "Ed25519" },
                        false,
                        ["sign", "verify"]
                    );

                    var publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
                    var publicKeyBytes = new Uint8Array(publicKeyBuffer);
                    var publicKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(publicKeyBytes)));

                    console.log("[CrossmintShadowSigner] Key pair generated, storing in IndexedDB...");

                    if (!db) {
                        throw new Error("Database not initialized");
                    }
                    var tx = db.transaction([STORE_NAME], "readwrite");
                    tx.objectStore(STORE_NAME).put(keyPair.privateKey, publicKeyBase64);
                    await new Promise(function(resolve, reject) {
                        tx.oncomplete = function() { resolve(); };
                        tx.onerror = function() { reject(tx.error); };
                    });

                    console.log("[CrossmintShadowSigner] Private key stored in IndexedDB");
                    console.log("[CrossmintShadowSigner] ✅ Key generation complete");

                    result = { publicKeyBytes: Array.from(publicKeyBytes) };
                    break;

                case "sign":
                    var publicKey = params.publicKey;
                    var messageBytes = params.messageBytes;

                    console.log("[CrossmintShadowSigner] Retrieving key from IndexedDB for signing...");

                    if (!db) {
                        throw new Error("Database not initialized");
                    }
                    var tx = db.transaction([STORE_NAME], "readonly");
                    var request = tx.objectStore(STORE_NAME).get(publicKey);
                    var privateKey = await new Promise(function(resolve, reject) {
                        request.onsuccess = function() { resolve(request.result); };
                        request.onerror = function() { reject(request.error); };
                    });

                    if (!privateKey) {
                        throw new Error("Private key not found for public key: " + publicKey);
                    }

                    console.log("[CrossmintShadowSigner] Key retrieved, signing...");

                    var signature = await crypto.subtle.sign(
                        { name: "Ed25519" },
                        privateKey,
                        new Uint8Array(messageBytes)
                    );

                    console.log("[CrossmintShadowSigner] ✅ Signing complete");
                    result = { signatureBytes: Array.from(new Uint8Array(signature)) };
                    break;

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
    console.log("[CrossmintShadowSigner] Function type:", typeof window.__crossmintShadowSignerStorage);
})();
true;
`;
