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
                    var chain = params.chain || "solana";
                    var isEVM = chain !== "solana" && chain !== "stellar";
                    
                    console.log("[CrossmintShadowSigner] Generating new key pair for chain:", chain, "isEVM:", isEVM);

                    var keyPair;
                    var algorithm;
                    
                    if (isEVM) {
                        // For EVM chains, use P256 (secp256r1)
                        keyPair = await crypto.subtle.generateKey(
                            { name: "ECDSA", namedCurve: "P-256" },
                            false,
                            ["sign", "verify"]
                        );
                        algorithm = "P-256";
                        console.log("[CrossmintShadowSigner] Generated P-256 key pair (non-extractable)");
                    } else {
                        // For Solana/Stellar, use Ed25519
                        keyPair = await crypto.subtle.generateKey(
                            { name: "Ed25519", namedCurve: "Ed25519" },
                            false,
                            ["sign", "verify"]
                        );
                        algorithm = "Ed25519";
                        console.log("[CrossmintShadowSigner] Generated Ed25519 key pair (non-extractable)");
                    }

                    var publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
                    var publicKeyBytes = new Uint8Array(publicKeyBuffer);
                    var publicKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(publicKeyBytes)));

                    console.log("[CrossmintShadowSigner] Key pair generated, storing in IndexedDB...");

                    if (!db) {
                        throw new Error("Database not initialized");
                    }
                    var tx = db.transaction([STORE_NAME], "readwrite");
                    tx.objectStore(STORE_NAME).put(keyPair.privateKey, publicKeyBase64);
                    tx.objectStore(STORE_NAME).put(algorithm, publicKeyBase64 + "_algorithm");
                    await new Promise(function(resolve, reject) {
                        tx.oncomplete = function() { resolve(); };
                        tx.onerror = function() { reject(tx.error); };
                    });

                    console.log("[CrossmintShadowSigner] Private key and algorithm stored in IndexedDB");
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
                    var keyRequest = tx.objectStore(STORE_NAME).get(publicKey);
                    var algorithmRequest = tx.objectStore(STORE_NAME).get(publicKey + "_algorithm");
                    
                    var privateKey = await new Promise(function(resolve, reject) {
                        keyRequest.onsuccess = function() { resolve(keyRequest.result); };
                        keyRequest.onerror = function() { reject(keyRequest.error); };
                    });

                    var algorithm = await new Promise(function(resolve, reject) {
                        algorithmRequest.onsuccess = function() { resolve(algorithmRequest.result); };
                        algorithmRequest.onerror = function() { resolve("Ed25519"); }; // Default to Ed25519
                    });

                    if (!privateKey) {
                        throw new Error("Private key not found for public key: " + publicKey);
                    }

                    console.log("[CrossmintShadowSigner] Key retrieved, signing with algorithm:", algorithm);

                    var signature;
                    if (algorithm === "P-256") {
                        // For P256, use ECDSA with SHA-256
                        signature = await crypto.subtle.sign(
                            { name: "ECDSA", hash: { name: "SHA-256" } },
                            privateKey,
                            new Uint8Array(messageBytes)
                        );
                    } else {
                        // Default to Ed25519
                        signature = await crypto.subtle.sign(
                            { name: "Ed25519" },
                            privateKey,
                            new Uint8Array(messageBytes)
                        );
                    }

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
