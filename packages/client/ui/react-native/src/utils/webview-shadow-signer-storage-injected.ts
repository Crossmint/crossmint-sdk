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

    // Hash-based command channel: #cmShadow=<base64(JSON({ id, operation, params }))>
    function decodeBase64ToJson(b64) {
        try {
            var json = atob(b64);
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }

    async function handleCommand(command) {
        if (!command || typeof command !== 'object') return;
        var id = command.id;
        var operation = command.operation;
        var params = command.params || {};
        try {
            var result;
            switch (operation) {
                case "generate":
                    console.log("[CrossmintShadowSigner] Generating new Ed25519 key pair (non-extractable)...");
                    var publicKeyBase64 = await storage.keyGenerator();
                    var publicKeyBytes = Array.from(atob(publicKeyBase64).split('').map(function(c){return c.charCodeAt(0);}));
                    console.log("[CrossmintShadowSigner] ✅ Key generation complete");
                    result = { publicKeyBytes: publicKeyBytes };
                    break;
                case "sign":
                    if (params == null) { throw new Error("Sign operation requires params"); }
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
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SHADOW_SIGNER_RESPONSE',
                id: id,
                result: result
            }));
        } catch (error) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SHADOW_SIGNER_RESPONSE',
                id: id,
                error: (error && (error.message || String(error))) || 'Unknown error'
            }));
        }
    }

    function parseAndHandleHash() {
        var hash = location.hash || '';
        var prefix = '#cmShadow=';
        if (hash.indexOf(prefix) !== 0) return;
        var b64 = hash.slice(prefix.length);
        var cmd = decodeBase64ToJson(decodeURIComponent(b64));
        try { history.replaceState('', document.title, location.pathname + location.search); } catch (_) {}
        handleCommand(cmd);
    }

    parseAndHandleHash();
    window.addEventListener('hashchange', parseAndHandleHash, false);

    console.log("[CrossmintShadowSigner] Storage handler installed in WebView");
})();
true;
`;
