/**
 * WebView injection script for BrowserDeviceSignerStorage
 *
 * This file creates the complete webview injection script by:
 * 1. Importing the compiled BrowserDeviceSignerStorage class from @crossmint/wallets-sdk
 * 2. Wrapping it with the React Native WebView API
 *
 * The storage class comes from:
 * @crossmint/wallets-sdk/src/signers/device-signer/device-signer-storage-browser.ts
 *
 * To rebuild the storage class: pnpm build in packages/wallets
 *
 * Note: The import will show a linter error until @crossmint/wallets-sdk is built.
 * The file is auto-generated during the wallets package build process.
 */

import { BROWSER_DEVICE_SIGNER_STORAGE_SCRIPT } from "@crossmint/wallets-sdk/dist/injected/device-signer-storage-browser-script";

// Create the complete webview injection script
export const DEVICE_SIGNER_STORAGE_INJECTED_JS = `
(function() {
    console.log("[CrossmintDeviceSigner] Starting injection...");
    
    // Inject the compiled BrowserDeviceSignerStorage class
    ${BROWSER_DEVICE_SIGNER_STORAGE_SCRIPT}
    
    // Create storage instance
    var storage = new CrossmintBrowserStorage.BrowserDeviceSignerStorage();
    console.log("[CrossmintDeviceSigner] Storage instance created");

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
                    console.log("[CrossmintDeviceSigner] Generating new Ed25519 key pair (non-extractable)...");
                    var publicKeyBase64 = await storage.keyGenerator();
                    console.log("[CrossmintDeviceSigner] ✅ Key generation complete");
                    result = { publicKeyBase64 };
                    break;
                case "sign":
                    if (params == null) { throw new Error("Sign operation requires params"); }
                    var publicKey = params.publicKey;
                    var messageBytes = params.messageBytes;
                    console.log("[CrossmintDeviceSigner] Signing...");
                    var signatureBytes = await storage.sign(publicKey, new Uint8Array(messageBytes));
                    console.log("[CrossmintDeviceSigner] ✅ Signing complete");
                    result = { signatureBytes: Array.from(signatureBytes) };
                    break;
                default:
                    throw new Error("Unknown operation: " + operation);
            }
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DEVICE_SIGNER_RESPONSE',
                id: id,
                result: result
            }));
        } catch (error) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'DEVICE_SIGNER_RESPONSE',
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

    console.log("[CrossmintDeviceSigner] Storage handler installed in WebView");
})();
true;
`;
