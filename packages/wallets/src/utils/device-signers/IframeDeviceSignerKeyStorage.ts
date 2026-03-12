import { getEnvironmentForKey, APIKeyEnvironmentPrefix, WithLoggerContext } from "@crossmint/common-sdk-base";
import { DeviceSignerKeyStorage } from "./DeviceSignerKeyStorage";
import { walletsLogger } from "../../logger";

const DEVICE_SIGNER_URL_MAP: Record<APIKeyEnvironmentPrefix, string> = {
    [APIKeyEnvironmentPrefix.DEVELOPMENT]: "http://localhost:3002", // "https://development.devicekey.store"
    [APIKeyEnvironmentPrefix.STAGING]: "https://staging.devicekey.store",
    [APIKeyEnvironmentPrefix.PRODUCTION]: "https://devicekey.store",
};

const DEFAULT_TIMEOUT_MS = 60_000;

const INDEXEDDB_FATAL_CODE = "indexeddb-fatal";

type IframeRpcResponse =
    | { type: "response"; id: string; result: unknown }
    | { type: "error"; id: string; error: string; code?: string };

/**
 * DeviceSignerKeyStorage backed by a hidden iframe.
 * All crypto operations are delegated to the iframe via postMessage RPC,
 * keeping key material isolated in the iframe's origin.
 */
export class IframeDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private iframePromise: Promise<HTMLIFrameElement> | null = null;
    private reloading: Promise<void> | null = null;
    private readonly iframeUrl: string;
    constructor(apiKey: string) {
        super(apiKey);
        const environment = getEnvironmentForKey(apiKey);
        if (environment == null) {
            throw new Error("Unable to determine environment from API key");
        }
        this.iframeUrl = DEVICE_SIGNER_URL_MAP[environment];
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.generateKey",
    })
    async generateKey(params: Parameters<DeviceSignerKeyStorage["generateKey"]>[0] = {}): Promise<string> {
        const result = await this.rpc<{ publicKeyBase64: string }>("generateKey", params);
        return result.publicKeyBase64;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.mapAddressToKey",
    })
    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        await this.rpc("mapAddressToKey", { address, publicKeyBase64 });
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.getKey",
    })
    async getKey(address: string): Promise<string | null> {
        const result = await this.rpc<{ publicKeyBase64: string | null }>("getKey", { address });
        return result.publicKeyBase64;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.hasKey",
    })
    async hasKey(publicKeyBase64: string): Promise<boolean> {
        const result = await this.rpc<{ exists: boolean }>("hasKey", { publicKeyBase64 });
        return result.exists;
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.signMessage",
    })
    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        return await this.rpc<{ r: string; s: string }>("signMessage", { address, message });
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "deviceSignerKeyStorage.deleteKey",
    })
    async deleteKey(address: string): Promise<void> {
        await this.rpc("deleteKey", { address });
    }

    destroy(): void {
        if (this.iframePromise != null) {
            this.iframePromise
                .then((iframe) => iframe.remove())
                .catch(() => {
                    /* noop */
                });
            this.iframePromise = null;
        }
    }

    // ── Internal helpers ─────────────────────────────────────────────

    private async rpc<T = unknown>(type: string, payload: Record<string, unknown>): Promise<T> {
        const response = await this.sendRpc<T>(type, payload);

        if (response.fatal) {
            walletsLogger.warn(
                `[IframeDeviceSignerKeyStorage] Recoverable IDB error on "${type}", reloading iframe and retrying`
            );
            await this.reloadIframe();
            const retry = await this.sendRpc<T>(type, payload);
            if (retry.fatal) {
                throw new Error(`Device signer IDB fatal error on "${type}" persisted after iframe reload`);
            }
            return retry.value;
        }

        return response.value;
    }

    private async sendRpc<T = unknown>(
        type: string,
        payload: Record<string, unknown>
    ): Promise<{ value: T; fatal: false } | { fatal: true }> {
        const iframe = await this.getIframe();
        const contentWindow = iframe.contentWindow;
        if (contentWindow == null) {
            throw new Error("Device signer iframe has no contentWindow");
        }

        const id = crypto.randomUUID();
        const expectedOrigin = new URL(this.iframeUrl).origin;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                window.removeEventListener("message", handler);
                reject(new Error(`Device signer RPC "${type}" timed out after ${DEFAULT_TIMEOUT_MS}ms`));
            }, DEFAULT_TIMEOUT_MS);

            function handler(event: MessageEvent<IframeRpcResponse>) {
                const data = event.data;
                if (data == null || data.id !== id) {
                    return;
                }

                if (event.origin !== expectedOrigin) {
                    return;
                }

                clearTimeout(timeout);
                window.removeEventListener("message", handler);

                if (data.type === "error" && data.code === INDEXEDDB_FATAL_CODE) {
                    resolve({ fatal: true });
                } else if (data.type === "error") {
                    reject(new Error(data.error));
                } else {
                    resolve({ value: data.result as T, fatal: false });
                }
            }

            window.addEventListener("message", handler);
            contentWindow.postMessage({ type, id, payload }, this.iframeUrl);
        });
    }

    /**
     * Destroy the current iframe and create a fresh one.
     * Uses a single-flight pattern to prevent concurrent reloads.
     */
    private async reloadIframe(): Promise<void> {
        if (this.reloading != null) {
            return this.reloading;
        }

        const reload = (async () => {
            try {
                this.destroy();
                await this.getIframe();
            } finally {
                this.reloading = null;
            }
        })();

        this.reloading = reload;
        return reload;
    }

    private getIframe(): Promise<HTMLIFrameElement> {
        if (this.iframePromise == null) {
            this.iframePromise = this.createIframe().catch((error) => {
                this.iframePromise = null;
                throw error;
            });
        }
        return this.iframePromise;
    }

    private createIframe(): Promise<HTMLIFrameElement> {
        const iframe = document.createElement("iframe");
        iframe.src = this.iframeUrl;

        // Invisible but functional — follows the pattern from NcsIframeManager
        Object.assign(iframe.style, {
            position: "absolute",
            opacity: "0",
            pointerEvents: "none",
            width: "0",
            height: "0",
            border: "none",
            top: "-9999px",
            left: "-9999px",
        });

        return new Promise((resolve, reject) => {
            iframe.onload = () => {
                resolve(iframe);
            };
            iframe.onerror = () => reject(new Error("Failed to load device signer iframe"));
            document.body.appendChild(iframe);
        });
    }
}
