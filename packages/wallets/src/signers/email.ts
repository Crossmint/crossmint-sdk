import { IFrameWindow } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { EmailInternalSignerConfig, Signer } from "./types";
import { EmailSignerApiClient } from "./email-signer-api-client";
import base58 from "bs58";
import { VersionedTransaction } from "@solana/web3.js";
import type { Crossmint } from "@crossmint/common-sdk-base";

export class EmailSigner implements Signer {
    type = "email" as const;
    private _apiClient: EmailSignerApiClient;
    private _needsAuth = false;
    private _authPromise: {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } | null = null;

    constructor(private config: EmailInternalSignerConfig) {
        this._apiClient = new EmailSignerApiClient(config.crossmint);
        this.initHandshakeParent();
    }

    locator() {
        return `solana-keypair:${this.config.signerAddress}`;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }
    async signTransaction(transaction: string) {
        await this.handleAuthRequired();
        const transactionBytes = base58.decode(transaction);
        const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
        const messageData = deserializedTransaction.message.serialize();
        const res = await this.config._handshakeParent?.sendAction({
            event: "request:sign",
            responseEvent: "response:sign",
            data: {
                authData: {
                    jwt: this.config.crossmint.jwt ?? "",
                    apiKey: this.config.crossmint.apiKey,
                },
                data: {
                    keyType: "ed25519",
                    bytes: base58.encode(messageData),
                    encoding: "base58",
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });
        if (res?.status === "error") {
            const err = new Error(res.error);
            (err as any).code = res.code;
            throw err;
        }
        if (res?.signature == null) {
            throw new Error("Failed to sign transaction");
        }
        if (res.signature.encoding !== "base58") {
            throw new Error("Unsupported signature encoding: " + res.signature.encoding);
        }
        return { signature: res.signature.bytes };
    }

    private async sendEmailWithOtp() {
        if (this.config._handshakeParent == null) {
            throw new Error("Handshake parent not initialized");
        }
        const authId = `email:${this.config.email}`;
        const response = await this.config._handshakeParent.sendAction({
            event: "request:start-onboarding",
            responseEvent: "response:start-onboarding",
            data: {
                authData: { jwt: this.config.crossmint.jwt ?? "", apiKey: this.config.crossmint.apiKey },
                data: { authId },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });

        if (response?.status === "success" && response.signerStatus === "ready") {
            this._needsAuth = false;
            return;
        }

        if (response?.status === "error") {
            console.error("[sendEmailWithOtp] Failed to send OTP:", response);
            this._authPromise?.reject(new Error(response.error || "Failed to initiate OTP process."));
        }
    }

    private async verifyOtp(encryptedOtp: string) {
        try {
            const response = await this.config._handshakeParent?.sendAction({
                event: "request:complete-onboarding",
                responseEvent: "response:complete-onboarding",
                data: {
                    authData: { jwt: this.config.crossmint.jwt ?? "", apiKey: this.config.crossmint.apiKey },
                    data: {
                        onboardingAuthentication: { encryptedOtp },
                    },
                },
                options: DEFAULT_EVENT_OPTIONS,
            });

            if (response?.status === "success") {
                console.log("[verifyOtp] OTP validation successful");
                this._needsAuth = false;
                // Resolve the auth promise since verification was successful
                this._authPromise?.resolve();
                return;
            } else {
                console.error("[verifyOtp] Failed to validate OTP:", response);
                this._needsAuth = true;
                const errorMessage = response?.status === "error" ? response.error : "Failed to validate encrypted OTP";
                this._authPromise?.reject(new Error(errorMessage));
            }
        } catch (err) {
            console.error("[verifyOtp] Error sending OTP validation request:", err);
            this._needsAuth = true;
            // Reject the auth promise since verification failed
            this._authPromise?.reject(err as Error);
            throw err;
        }
    }

    private async handleAuthRequired() {
        if (!this._needsAuth) {
            return;
        }

        let resolvePromise: () => void;
        let rejectPromise: (error: Error) => void;

        const promise = new Promise<void>((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        this._authPromise = {
            promise,
            resolve: resolvePromise!,
            reject: rejectPromise!,
        };

        try {
            await this._authPromise.promise;
        } catch (error) {
            throw error;
        }
    }

    private async initHandshakeParent() {
        if (this.config._handshakeParent == null) {
            const iframeUrl = new URL("https://signers.crossmint.com/");
            iframeUrl.searchParams.set("environment", this._apiClient.environment);
            const iframeElement = await this.createInvisibleIFrame(iframeUrl.toString());
            const handshakeParent = await IFrameWindow.init(iframeElement, {
                targetOrigin: iframeUrl.origin,
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
            });
            this.config._handshakeParent = handshakeParent;
            await handshakeParent.handshakeWithChild();
        }
    }

    static async pregenerateSigner(email: string, crossmint: Crossmint): Promise<string> {
        if (email == null) {
            throw new Error("Email is required to pregenerate a signer");
        }
        const response = await new EmailSignerApiClient(crossmint).pregenerateSigner(email);

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to fetch public key: ${response.status} ${errorBody}`);
        }

        const responseData = await response.json();
        const publicKey = responseData.publicKey;
        if (publicKey == null) {
            throw new Error("No public key found");
        }
        if (publicKey.encoding !== "base58" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
            throw new Error(
                "Not supported. Expected public key to be in base58 encoding and ed25519 key type. Got: " +
                    JSON.stringify(publicKey)
            );
        }

        const adminSignerAddress = publicKey.bytes;
        return adminSignerAddress;
    }

    private async createInvisibleIFrame(url: string): Promise<HTMLIFrameElement> {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        // Make the iframe invisible but functional
        iframe.style.position = "absolute";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";

        return new Promise((resolve, reject) => {
            iframe.onload = () => resolve(iframe);
            iframe.onerror = () => reject("Failed to load iframe content");
            document.body.appendChild(iframe);
        });
    }
}

const DEFAULT_EVENT_OPTIONS = {
    timeoutMs: 10_000,
    intervalMs: 5_000,
};
