/**
 * WebView injection script for BrowserShadowSignerStorage
 *
 * This file creates the complete webview injection script by:
 * 1. Importing the compiled BrowserShadowSignerStorage class from @crossmint/wallets-sdk
 * 2. Wrapping it with the React Native WebView API
 *
 * The storage class comes from:
 * @crossmint/wallets-sdk/src/signers/shadow-signer/shadow-signer-storage-browser.ts
 *
 * To rebuild the storage class: pnpm build in packages/wallets
 *
 * Note: The import will show a linter error until @crossmint/wallets-sdk is built.
 * The file is auto-generated during the wallets package build process.
 */

import { BROWSER_SHADOW_SIGNER_STORAGE_SCRIPT } from "@crossmint/wallets-sdk/dist/injected/shadow-signer-storage-browser-script";

// Create the complete webview injection script
export const SHADOW_SIGNER_STORAGE_INJECTED_JS = `
(function() {
    console.log("[CrossmintShadowSigner] Starting injection...");
    
    // Inject the compiled BrowserShadowSignerStorage class
    ${BROWSER_SHADOW_SIGNER_STORAGE_SCRIPT}
    
    // Create storage instance
    var storage = new CrossmintBrowserStorage.BrowserShadowSignerStorage();
    console.log("[CrossmintShadowSigner] Storage instance created");

    // Expose the API that React Native expects
    window.__crossmintShadowSignerStorage = async function(operation, params) {
        console.log("[CrossmintShadowSigner] Function called with operation:", operation);
        try {
            var result;

            switch (operation) {
                case "generate":
                    console.log("[CrossmintShadowSigner] Generating new Ed25519 key pair (non-extractable)...");
                    var publicKeyBase64 = await storage.keyGenerator(params.chain);
                    var publicKeyBytes = Array.from(atob(publicKeyBase64).split('').map(function(c) { 
                        return c.charCodeAt(0); 
                    }));
                    console.log("[CrossmintShadowSigner] ✅ Key generation complete");
                    result = { publicKeyBase64 };
                    break;

                case "sign":
                    if (params == null) {
                        throw new Error("Sign operation requires params");
                    }
                    
                    var publicKey = params.publicKey;
                    var messageBytes = params.messageBytes;
                    
                    console.log("[CrossmintShadowSigner] Signing...");
                    var signatureBytes = await storage.sign(publicKey, new Uint8Array(messageBytes));
                    
                    console.log("[CrossmintShadowSigner] ✅ Signing complete");
                    result = { signatureBytes: Array.from(signatureBytes) };
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
