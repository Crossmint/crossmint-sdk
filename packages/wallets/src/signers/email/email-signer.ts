import type { EmailInternalSignerConfig, Signer } from "../types";
import { AuthRejectedError } from "../types";
import { EmailIframeManager } from "./email-iframe-manager";
import { validateAPIKey } from "@crossmint/common-sdk-base";

export abstract class EmailSigner implements Signer {
    type = "email" as const;
    private _needsAuth = true;
    private _authPromise: {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } | null = null;

    constructor(protected config: EmailInternalSignerConfig) {
        this.initialize();
    }

    abstract locator(): string;

    private async initialize() {
        // Initialize iframe if no custom handshake parent is provided
        if (this.config._handshakeParent == null) {
            const parsedAPIKey = validateAPIKey(this.config.crossmint.apiKey);
            if (!parsedAPIKey.isValid) {
                throw new Error("Invalid API key");
            }
            const iframeManager = new EmailIframeManager({ environment: parsedAPIKey.environment });
            this.config._handshakeParent = await iframeManager.initialize();
        }
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }

    abstract signTransaction(transaction: string): Promise<{ signature: string }>;

    protected async handleAuthRequired() {
        if (this.config._handshakeParent == null) {
            throw new Error("Handshake parent not initialized");
        }

        // Determine if we need to authenticate the user via OTP or not
        const signerResponse = await this.config._handshakeParent?.sendAction({
            event: "request:get-status",
            responseEvent: "response:get-status",
            data: {
                authData: {
                    jwt: this.config.crossmint.experimental_customAuth?.jwt ?? "",
                    apiKey: this.config.crossmint.apiKey,
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });

        if (signerResponse?.status !== "success") {
            throw new Error(signerResponse?.error);
        }

        if (signerResponse.signerStatus === "ready") {
            this._needsAuth = false;
            return;
        }

        const { promise, resolve, reject } = this.createAuthPromise();
        this._authPromise = { promise, resolve, reject };

        if (this.config.onAuthRequired) {
            try {
                await this.config.onAuthRequired(
                    this._needsAuth,
                    () => this.sendEmailWithOtp(),
                    (otp) => this.verifyOtp(otp),
                    () => reject(new AuthRejectedError())
                );
            } catch (error) {
                reject(error as Error);
            }
        }

        try {
            await promise;
        } catch (error) {
            throw error;
        }
    }

    private createAuthPromise(): { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void } {
        let resolvePromise!: () => void;
        let rejectPromise!: (error: Error) => void;

        const promise = new Promise<void>((resolve, reject) => {
            resolvePromise = resolve;
            rejectPromise = reject;
        });

        return { promise, resolve: resolvePromise, reject: rejectPromise };
    }

    private async sendEmailWithOtp() {
        if (this.config._handshakeParent == null) {
            throw new Error("Handshake parent not initialized");
        }

        const handshakeParent = this.config._handshakeParent;
        const authId = `email:${this.config.email}`;
        const response = await handshakeParent.sendAction({
            event: "request:start-onboarding",
            responseEvent: "response:start-onboarding",
            data: {
                authData: {
                    jwt: this.config.crossmint.experimental_customAuth?.jwt ?? "",
                    apiKey: this.config.crossmint.apiKey,
                },
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
        if (this.config._handshakeParent == null) {
            throw new Error("Handshake parent not initialized");
        }

        const handshakeParent = this.config._handshakeParent;
        try {
            const response = await handshakeParent.sendAction({
                event: "request:complete-onboarding",
                responseEvent: "response:complete-onboarding",
                data: {
                    authData: {
                        jwt: this.config.crossmint.experimental_customAuth?.jwt ?? "",
                        apiKey: this.config.crossmint.apiKey,
                    },
                    data: {
                        onboardingAuthentication: { encryptedOtp },
                    },
                },
                options: DEFAULT_EVENT_OPTIONS,
            });

            if (response?.status === "success") {
                this._needsAuth = false;
                this._authPromise?.resolve();
                return;
            }

            console.error("[verifyOtp] Failed to validate OTP:", response);
            this._needsAuth = true;
            const errorMessage = response?.status === "error" ? response.error : "Failed to validate encrypted OTP";
            this._authPromise?.reject(new Error(errorMessage));
        } catch (err) {
            console.error("[verifyOtp] Error sending OTP validation request:", err);
            this._needsAuth = true;
            this._authPromise?.reject(err as Error);
            throw err;
        }
    }

    static async pregenerateSigner(email: string, crossmint: Crossmint): Promise<string> {
        if (email == null || crossmint.experimental_customAuth?.email == null) {
            throw new Error("Email is required to pregenerate a signer");
        }

        try {
            const response = await new EmailSignerApiClient(crossmint).pregenerateSigner(
                email ?? crossmint.experimental_customAuth.email
            );
            const publicKey = response.publicKey;

            if (publicKey == null) {
                throw new Error("No public key found");
            }

            if (publicKey.encoding !== "base58" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
                throw new Error(
                    "Not supported. Expected public key to be in base58 encoding and ed25519 key type. Got: " +
                        JSON.stringify(publicKey)
                );
            }

            return publicKey.bytes;
        } catch (error) {
            console.error("[EmailSigner] Failed to pregenerate signer:", error);
            throw error;
        }
    }
}

const DEFAULT_EVENT_OPTIONS = {
    timeoutMs: 10_000,
    intervalMs: 5_000,
};
