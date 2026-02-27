import { getEnvironmentForKey, APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { WebAuthnP256 } from "ox";
import { DeviceSignerKeyStorage } from "./DeviceSignerKeyStorage";

const DEVICE_SIGNER_URL_MAP: Record<APIKeyEnvironmentPrefix, string> = {
    [APIKeyEnvironmentPrefix.DEVELOPMENT]: "http://localhost:3002",
    [APIKeyEnvironmentPrefix.STAGING]: "https://device-signer.crossmint.com",
    [APIKeyEnvironmentPrefix.PRODUCTION]: "https://device-signer.crossmint.com",
};

const DEFAULT_TIMEOUT_MS = 60_000;

type IframeRpcResponse =
    | { type: "response"; id: string; result: unknown }
    | { type: "error"; id: string; error: string };

type BiometricRequestMessage = {
    type: "biometric-request";
    id: string;
    action: "createCredential" | "sign";
    payload: { name: string } | { credentialId: string; challenge: string };
};

/**
 * Callback invoked before a WebAuthn ceremony to obtain user activation.
 * Implementations should show a UI prompt and resolve when the user interacts (e.g. clicks a button).
 * @param action - The biometric action being requested: `"createCredential"` for wallet creation, `"sign"` for transaction signing.
 */
export type BiometricRequestHandler = (action: "createCredential" | "sign") => Promise<void>;

/**
 * DeviceSignerKeyStorage backed by a hidden iframe.
 * All crypto operations are delegated to the iframe via postMessage RPC,
 * keeping key material isolated in the iframe's origin.
 */
export class IframeDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private iframePromise: Promise<HTMLIFrameElement> | null = null;
    private readonly iframeUrl: string;
    private biometricRequestHandler: BiometricRequestHandler | null = null;
    private biometricListener: ((event: MessageEvent) => void) | null = null;

    constructor(apiKey: string) {
        super(apiKey);
        const environment = getEnvironmentForKey(apiKey);
        if (environment == null) {
            throw new Error("Unable to determine environment from API key");
        }
        this.iframeUrl = DEVICE_SIGNER_URL_MAP[environment];
    }

    /**
     * Set a handler that is called before each WebAuthn ceremony to obtain user activation.
     * The handler should show a UI prompt (e.g. PasskeyPrompt) and resolve when the user clicks.
     */
    setBiometricRequestHandler(handler: BiometricRequestHandler): void {
        this.biometricRequestHandler = handler;
    }

    async generateKey(
        params: Parameters<DeviceSignerKeyStorage["generateKey"]>[0] = { biometricPolicy: "none" }
    ): Promise<string> {
        const result = await this.rpc<{ publicKeyBase64: string }>("generateKey", params);
        return result.publicKeyBase64;
    }

    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        await this.rpc("mapAddressToKey", { address, publicKeyBase64 });
    }

    async getKey(address: string): Promise<string | null> {
        const result = await this.rpc<{ publicKeyBase64: string | null }>("getKey", { address });
        return result.publicKeyBase64;
    }

    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        return await this.rpc<{ r: string; s: string }>("signMessage", { address, message });
    }

    async deleteKey(address: string): Promise<void> {
        await this.rpc("deleteKey", { address });
    }

    destroy(): void {
        if (this.biometricListener != null) {
            window.removeEventListener("message", this.biometricListener);
            this.biometricListener = null;
        }

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
        const iframe = await this.getIframe();
        const contentWindow = iframe.contentWindow;
        if (contentWindow == null) {
            throw new Error("Device signer iframe has no contentWindow");
        }

        const id = crypto.randomUUID();
        const expectedOrigin = new URL(this.iframeUrl).origin;

        return new Promise<T>((resolve, reject) => {
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

                if (data.type === "error") {
                    reject(new Error(data.error));
                } else {
                    resolve(data.result as T);
                }
            }

            window.addEventListener("message", handler);
            contentWindow.postMessage({ type, id, payload }, this.iframeUrl);
        });
    }

    private setupBiometricListener(iframe: HTMLIFrameElement): void {
        const expectedOrigin = new URL(this.iframeUrl).origin;

        this.biometricListener = async (event: MessageEvent) => {
            if (event.origin !== expectedOrigin) {
                return;
            }

            const data = event.data as BiometricRequestMessage;
            if (data?.type !== "biometric-request") {
                return;
            }

            const contentWindow = iframe.contentWindow;
            if (contentWindow == null) {
                return;
            }

            try {
                // Request user activation via the registered handler (e.g. PasskeyPrompt)
                if (this.biometricRequestHandler != null) {
                    await this.biometricRequestHandler(data.action);
                }

                let result: unknown = null;

                if (data.action === "createCredential") {
                    const payload = data.payload as { name: string };
                    const credential = await WebAuthnP256.createCredential({ name: payload.name });
                    result = {
                        id: credential.id,
                        publicKey: {
                            x: `0x${credential.publicKey.x.toString(16)}`,
                            y: `0x${credential.publicKey.y.toString(16)}`,
                        },
                    };
                } else if (data.action === "sign") {
                    const payload = data.payload as { credentialId: string; challenge: string };
                    const { signature, metadata } = await WebAuthnP256.sign({
                        credentialId: payload.credentialId,
                        challenge: payload.challenge as `0x${string}`,
                    });
                    result = {
                        signature: {
                            r: `0x${signature.r.toString(16)}`,
                            s: `0x${signature.s.toString(16)}`,
                        },
                        metadata,
                    };
                }

                contentWindow.postMessage({ type: "biometric-response", id: data.id, result }, this.iframeUrl);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Unknown biometric error";
                contentWindow.postMessage({ type: "biometric-response", id: data.id, error: message }, this.iframeUrl);
            }
        };

        window.addEventListener("message", this.biometricListener);
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
        iframe.allow = "publickey-credentials-create; publickey-credentials-get";

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
                this.setupBiometricListener(iframe);
                resolve(iframe);
            };
            iframe.onerror = () => reject(new Error("Failed to load device signer iframe"));
            document.body.appendChild(iframe);
        });
    }
}
