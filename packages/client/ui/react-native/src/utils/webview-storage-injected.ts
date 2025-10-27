/**
 * JavaScript code to be injected into the WebView for shadow signer storage.
 * This code runs in the WebView context and has access to IndexedDB and Web Crypto API.
 *
 * The code handles:
 * - Ed25519 key generation (non-extractable)
 * - Storing keys in IndexedDB via structured cloning
 * - Signing operations using stored keys
 * - Key management (check existence, delete)
 *
 * Security:
 * - Keys are generated with extractable: false
 * - crypto.subtle.exportKey() will fail on these keys
 * - Keys can only be used for signing
 * - Once created, they remain non-extractable forever
 */
export const SHADOW_SIGNER_STORAGE_INJECTED_JS = `
(function() {
    const DB_NAME = 'crossmint_shadow_keys';
    const STORE_NAME = 'keys';
    let db = null;

    // Open IndexedDB
    async function openDB() {
        if (db) return db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    // Initialize DB immediately
    openDB().then(() => {
        console.log('[CrossmintShadowSigner] IndexedDB ready for non-extractable key storage');
    }).catch(e => {
        console.error('[CrossmintShadowSigner] IndexedDB init failed:', e);
    });

    // Storage operation handler
    window.__crossmintShadowSignerStorage = async function(operation, params) {
        try {
            await openDB();
            let result;

            switch (operation) {
                case 'generate': {
                    console.log('[CrossmintShadowSigner] Generating new Ed25519 key pair (non-extractable)...');
                    
                    // Generate Ed25519 key pair (NON-EXTRACTABLE)
                    const keyPair = await crypto.subtle.generateKey(
                        { name: 'Ed25519', namedCurve: 'Ed25519' },
                        false, // ← NON-EXTRACTABLE - this is PERMANENT and IMMUTABLE
                        ['sign', 'verify']
                    );

                    // Export public key only (public keys are exportable)
                    const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
                    const publicKeyBytes = new Uint8Array(publicKeyBuffer);
                    
                    // Convert public key to base64 to use as the index
                    const publicKeyBase64 = btoa(String.fromCharCode.apply(null, publicKeyBytes));

                    console.log('[CrossmintShadowSigner] Key pair generated, storing in IndexedDB with public key as index...');

                    // Store private key in IndexedDB indexed by publicKeyBase64
                    // The CryptoKey object is cloned with its non-extractable flag intact
                    const tx = db.transaction([STORE_NAME], 'readwrite');
                    tx.objectStore(STORE_NAME).put(keyPair.privateKey, publicKeyBase64);
                    await new Promise((resolve, reject) => {
                        tx.oncomplete = resolve;
                        tx.onerror = () => reject(tx.error);
                    });

                    console.log('[CrossmintShadowSigner] Private key stored in IndexedDB[publicKey]');
                    console.log('[CrossmintShadowSigner] ✅ Key generation complete');
                    
                    result = { publicKeyBytes: Array.from(publicKeyBytes) };
                    break;
                }

                case 'sign': {
                    const { publicKey, messageBytes } = params;
                    
                    console.log('[CrossmintShadowSigner] Retrieving key from IndexedDB for signing...');
                    
                    // Retrieve non-extractable private key from IndexedDB using publicKey as index
                    const tx = db.transaction([STORE_NAME], 'readonly');
                    const request = tx.objectStore(STORE_NAME).get(publicKey);
                    const privateKey = await new Promise((resolve, reject) => {
                        request.onsuccess = () => resolve(request.result);
                        request.onerror = () => reject(request.error);
                    });

                    if (!privateKey) {
                        throw new Error('Private key not found for public key: ' + publicKey);
                    }

                    console.log('[CrossmintShadowSigner] Key retrieved, signing...');

                    // Sign using the non-extractable key
                    // The key is used for signing but cannot be exported
                    const signature = await crypto.subtle.sign(
                        { name: 'Ed25519' },
                        privateKey,
                        new Uint8Array(messageBytes)
                    );

                    console.log('[CrossmintShadowSigner] ✅ Signing complete');
                    result = { signatureBytes: Array.from(new Uint8Array(signature)) };
                    break;
                }

                default:
                    throw new Error('Unknown operation: ' + operation);
            }

            return result;
        } catch (error) {
            console.error('[CrossmintShadowSigner] Operation failed:', operation, error);
            throw error;
        }
    };

    console.log('[CrossmintShadowSigner] Storage handler installed in WebView');
})();
true;
`;
