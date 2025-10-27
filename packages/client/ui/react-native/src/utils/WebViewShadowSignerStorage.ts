import type { ShadowSignerStorage, ShadowSignerData } from "@crossmint/wallets-sdk";
import { SecureStorage } from "./SecureStorage";
import { SHADOW_SIGNER_STORAGE_INJECTED_JS } from "./webview-storage-injected";
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";

/**
 * Shadow signer storage using WebView's IndexedDB.
 *
 * This leverages the existing react-native-webview-crypto WebView to access IndexedDB.
 *
 * Architecture:
 * 1. Keys generated in WebView using Web Crypto API (non-extractable)
 * 2. Keys stored in WebView's IndexedDB via structured cloning
 * 3. Signing happens in WebView (keys retrieved from IndexedDB)
 * 4. Only signatures cross the bridge to React Native
 * 5. CryptoKey objects NEVER leave the WebView
 *
 * Benefits:
 * - ✅ Non-extractable CryptoKey objects (cannot be exported once created)
 * - ✅ Keys stored in persistent IndexedDB (survives app restarts)
 * - ✅ No native code required
 * - ✅ Uses existing WebView infrastructure
 * - ✅ Same security model as browser implementation
 *
 * Security:
 * - Keys created as non-extractable in WebView (extractable: false)
 * - crypto.subtle.exportKey() will ALWAYS fail on these keys
 * - Even if code is added later, keys remain non-extractable (immutable flag)
 * - Stored in WebView's persistent IndexedDB storage
 *
 * Persistence:
 * - ✅ IndexedDB persists across app restarts
 * - Location: Library/WebKit/WebsiteData/ (iOS), app_webview/ (Android)
 * - Only cleared when app uninstalled or storage explicitly cleared
 */
export class WebViewShadowSignerStorage implements ShadowSignerStorage {
    private readonly SHADOW_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";
    private secureStorage = new SecureStorage();
    private webViewRef: RefObject<WebView | null> | null = null;
    private isInjected = false;
    private isReady = false;
    private readyPromise: Promise<void>;
    private readyResolve: (() => void) | null = null;

    constructor() {
        // Create ready promise immediately so operations can wait for it
        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
        });
    }

    /**
     * Initializes the WebView storage with a WebView ref.
     *
     * @param webViewRef Reference to the WebView instance
     */
    initialize(webViewRef: RefObject<WebView | null>): void {
        this.webViewRef = webViewRef;
        // Inject the storage handler (this will resolve the ready promise)
        this.injectStorageHandler();
    }

    /**
     * Injects the IndexedDB storage handler into the WebView.
     * This only needs to be done once when the WebView loads.
     */
    private injectStorageHandler(): void {
        if (this.isInjected || !this.webViewRef?.current) {
            return;
        }

        try {
            this.webViewRef.current.injectJavaScript(SHADOW_SIGNER_STORAGE_INJECTED_JS);
            this.isInjected = true;
            this.isReady = true;
            console.log("[WebViewShadowSignerStorage] Storage handler injected into WebView");

            // Resolve the ready promise
            if (this.readyResolve) {
                this.readyResolve();
                this.readyResolve = null;
            }
        } catch (error) {
            console.error("[WebViewShadowSignerStorage] Failed to inject storage handler:", error);
        }
    }

    /**
     * Waits for the WebView to be ready before proceeding.
     */
    private async ensureReady(): Promise<void> {
        if (this.isReady) {
            return;
        }

        console.log("[WebViewShadowSignerStorage] Waiting for WebView to be ready...");
        await this.readyPromise;
    }

    /**
     * Public method to wait for WebView to be ready.
     * Used by initializeWebView to ensure shadow signer WebView is ready before wallet creation.
     */
    async waitForReady(): Promise<void> {
        return this.ensureReady();
    }

    private pendingRequests = new Map<
        string,
        {
            resolve: (value: Record<string, unknown>) => void;
            reject: (error: unknown) => void;
            timeout: ReturnType<typeof setTimeout>;
        }
    >();

    /**
     * Message handler that should be called from the WebView's onMessage prop.
     * Pass this to your WebView component or call it from your existing message handler.
     */
    handleMessage = (event: { nativeEvent: { data: string } }) => {
        try {
            const message = JSON.parse(event.nativeEvent.data) as {
                type?: string;
                id?: string;
                result?: Record<string, unknown>;
                error?: string;
            };

            if (message.type === "SHADOW_SIGNER_RESPONSE" && message.id) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingRequests.delete(message.id);

                    if (message.error) {
                        pending.reject(new Error(message.error));
                    } else {
                        pending.resolve(message.result ?? {});
                    }
                }
            }
        } catch {
            // Ignore parse errors - might be other messages
        }
    };

    /**
     * Calls a function in the WebView and returns the result.
     */
    private async callWebViewFunction(
        operation: string,
        params: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        // Wait for WebView to be ready
        await this.ensureReady();

        const webView = this.webViewRef?.current;
        if (!webView) {
            throw new Error("WebView not available. Make sure to initialize() with a WebView ref.");
        }

        const id = `shadow_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        return new Promise((resolve, reject) => {
            const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`WebView storage operation timed out: ${operation}`));
            }, 30000);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            // Inject JavaScript to call the storage function
            const script = `
(async function() {
    try {
        const result = await window.__crossmintShadowSignerStorage('${operation}', ${JSON.stringify(params)});
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHADOW_SIGNER_RESPONSE',
            id: '${id}',
            result: result
        }));
    } catch (error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHADOW_SIGNER_RESPONSE',
            id: '${id}',
            error: error.message || String(error)
        }));
    }
})();
true;
            `;

            webView.injectJavaScript(script);
        });
    }

    // ===== ShadowSignerStorage Interface Implementation =====

    /**
     * Stores metadata in React Native SecureStore.
     */
    async storeMetadata(walletAddress: string, data: ShadowSignerData): Promise<void> {
        try {
            await this.secureStorage.set(
                `${this.SHADOW_SIGNER_STORAGE_KEY}_meta_${walletAddress}`,
                JSON.stringify(data)
            );
        } catch (error) {
            console.error("Failed to store metadata:", error);
            throw error;
        }
    }

    /**
     * Gets metadata from React Native SecureStore.
     */
    async getMetadata(walletAddress: string): Promise<ShadowSignerData | null> {
        try {
            const key = `${this.SHADOW_SIGNER_STORAGE_KEY}_meta_${walletAddress}`;
            console.log("[WebViewShadowSignerStorage] Getting metadata for key:", key);

            // Use SecureStore directly to avoid the value/expiresAt wrapping from SecureStorage
            const stored = await SecureStore.getItemAsync(key);

            console.log("[WebViewShadowSignerStorage] Retrieved raw metadata:", stored);

            if (!stored) {
                return null;
            }

            const parsed = JSON.parse(stored);
            console.log("[WebViewShadowSignerStorage] Parsed metadata:", parsed);

            return parsed;
        } catch (error) {
            console.error("[WebViewShadowSignerStorage] Failed to retrieve metadata from SecureStorage:", error);
            return null;
        }
    }

    /**
     * Generates a key pair in the WebView and stores it in IndexedDB.
     * Returns the public key as base64.
     * The private key is stored in IndexedDB indexed by the public key.
     */
    async keyGenerator(): Promise<string> {
        const publicKeyBytes = await this.generateKeyInWebView();
        const publicKeyBase64 = Buffer.from(publicKeyBytes).toString("base64");

        // Key is already stored in WebView's IndexedDB, indexed by publicKeyBase64

        return publicKeyBase64;
    }

    /**
     * Signs data using a key stored in WebView's IndexedDB.
     * @param publicKeyBase64 - Base64-encoded public key used to lookup the private key
     */
    async sign(publicKeyBase64: string, data: Uint8Array): Promise<Uint8Array> {
        return await this.signInWebView(publicKeyBase64, data);
    }

    // ===== WebView-Specific Methods =====

    /**
     * Generates a key pair in the WebView and stores it in IndexedDB.
     * The key is created as non-extractable and cannot be exported.
     * Returns the public key bytes.
     *
     * The key is stored in IndexedDB indexed by its base64-encoded public key.
     */
    private async generateKeyInWebView(): Promise<Uint8Array> {
        const response = await this.callWebViewFunction("generate", {});
        const publicKeyBytes = response.publicKeyBytes as number[];
        return new Uint8Array(publicKeyBytes);
    }

    /**
     * Signs data using a key stored in WebView's IndexedDB.
     * Signing happens entirely in the WebView; private key never crosses the bridge.
     *
     * @param publicKeyBase64 - Base64-encoded public key used to lookup the private key in IndexedDB
     * @param data - Data to sign
     */
    private async signInWebView(publicKeyBase64: string, data: Uint8Array): Promise<Uint8Array> {
        const messageBytes = Array.from(data);
        const response = await this.callWebViewFunction("sign", { publicKey: publicKeyBase64, messageBytes });
        const signatureBytes = response.signatureBytes as number[];
        return new Uint8Array(signatureBytes);
    }
}
