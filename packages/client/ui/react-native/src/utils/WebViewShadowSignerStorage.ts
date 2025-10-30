import type { ShadowSignerStorage, ShadowSignerData } from "@crossmint/wallets-sdk";
import { SecureStorage } from "./SecureStorage";
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer/";

export class WebViewShadowSignerStorage implements ShadowSignerStorage {
    private readonly SHADOW_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";
    private secureStorage = new SecureStorage();
    private webViewRef: RefObject<WebView | null> | null = null;
    private sendCommandViaHash: ((hash: string) => void) | null = null;
    private readyPromise: Promise<void>;
    private readyResolve: (() => void) | null = null;

    constructor() {
        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve;
        });
    }

    initialize(webViewRef: RefObject<WebView | null>, sendCommandViaHash?: (hash: string) => void): void {
        this.webViewRef = webViewRef;
        if (sendCommandViaHash) {
            this.sendCommandViaHash = sendCommandViaHash;
        }
        if (this.readyResolve) {
            this.readyResolve();
            this.readyResolve = null;
        }
    }

    // No runtime JS injection; handler is pre-injected by the WebView

    async waitForReady(): Promise<void> {
        await this.readyPromise;
    }

    private pendingRequests = new Map<
        string,
        {
            resolve: (value: Record<string, unknown>) => void;
            reject: (error: unknown) => void;
            timeout: ReturnType<typeof setTimeout>;
        }
    >();

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

    private async callWebViewFunction(
        operation: string,
        params: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        if (this.sendCommandViaHash == null) {
            throw new Error("Shadow signer command channel not initialized");
        }

        const id = `shadow_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        return new Promise((resolve, reject) => {
            const timeout: ReturnType<typeof setTimeout> = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`WebView storage operation timed out: ${operation}`));
            }, 30000);

            this.pendingRequests.set(id, { resolve, reject, timeout });

            const payload = { id, operation, params };
            const b64 = btoa(JSON.stringify(payload));
            const hash = `#cmShadow=${encodeURIComponent(b64)}`;
            this.sendCommandViaHash!(hash);
        });
    }

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

    async getMetadata(walletAddress: string): Promise<ShadowSignerData | null> {
        try {
            const key = `${this.SHADOW_SIGNER_STORAGE_KEY}_meta_${walletAddress}`;
            console.log("[WebViewShadowSignerStorage] Getting metadata for key:", key);

            const stored = await SecureStore.getItemAsync(key);

            console.log("[WebViewShadowSignerStorage] Retrieved raw metadata:", stored);

            if (stored == null) {
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

    async keyGenerator(): Promise<string> {
        const publicKeyBytes = await this.generateKeyInWebView();
        return Buffer.from(publicKeyBytes).toString("base64");
    }

    async sign(publicKeyBase64: string, data: Uint8Array): Promise<Uint8Array> {
        return await this.signInWebView(publicKeyBase64, data);
    }

    private async generateKeyInWebView(): Promise<Uint8Array> {
        const response = await this.callWebViewFunction("generate", {});
        const publicKeyBytes = response.publicKeyBytes as number[];
        return new Uint8Array(publicKeyBytes);
    }

    private async signInWebView(publicKeyBase64: string, data: Uint8Array): Promise<Uint8Array> {
        const messageBytes = Array.from(data);
        const response = await this.callWebViewFunction("sign", { publicKey: publicKeyBase64, messageBytes });
        const signatureBytes = response.signatureBytes as number[];
        return new Uint8Array(signatureBytes);
    }
}
