import type { BaseSignResult, EmailInternalSignerConfig, PhoneInternalSignerConfig, Signer } from "../types";
import { AuthRejectedError } from "../types";
import { NcsIframeManager } from "./ncs-iframe-manager";
import { validateAPIKey } from "@crossmint/common-sdk-base";

export abstract class NonCustodialSigner implements Signer {
    public readonly type: "email" | "phone";
    private _needsAuth = true;
    private _authPromise: {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } | null = null;

    constructor(protected config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        this.initialize();
        this.type = this.config.type;
    }

    abstract locator(): string;
    abstract signMessage(message: string): Promise<BaseSignResult>;

    private async initialize() {
        // Initialize iframe if no custom handshake parent is provided
        if (this.config.clientTEEConnection == null) {
            const parsedAPIKey = validateAPIKey(this.config.crossmint.apiKey);
            if (!parsedAPIKey.isValid) {
                throw new Error("Invalid API key");
            }
            const iframeManager = new NcsIframeManager({ environment: parsedAPIKey.environment });
            this.config.clientTEEConnection = await iframeManager.initialize();
        }
    }

    abstract signTransaction(transaction: string): Promise<{ signature: string }>;

    protected async handleAuthRequired() {
        if (this.config.clientTEEConnection == null) {
            if (this.config.onAuthRequired == null) {
                throw new Error(
                    `${this.type} signer requires the onAuthRequired callback to handle OTP verification. ` +
                        `This callback manages the authentication flow (sending OTP and verifying user input). ` +
                        `If using our React/React Native SDK, this is handled automatically by the provider. ` +
                        `For other environments, implement: onAuthRequired: (needsAuth, sendOtp, verifyOtp, reject) => { /* your UI logic */ }`
                );
            }
            throw new Error("Handshake parent not initialized");
        }

        // Determine if we need to authenticate the user via OTP or not
        const signerResponse = await this.config.clientTEEConnection?.sendAction({
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
                    () => this.sendMessageWithOtp(),
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

    protected getJwtOrThrow() {
        const jwt = this.config.crossmint.experimental_customAuth?.jwt;
        if (jwt == null) {
            throw new Error("JWT is required");
        }
        return jwt;
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

    private async sendMessageWithOtp() {
        if (this.config.clientTEEConnection == null) {
            throw new Error("Handshake parent not initialized");
        }

        const handshakeParent = this.config.clientTEEConnection;
        const authId = this.getAuthId();
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
            console.error("[sendMessageWithOtp] Failed to send OTP:", response);
            this._authPromise?.reject(new Error(response.error || "Failed to initiate OTP process."));
        }
    }

    private getAuthId() {
        if (this.config.type === "email") {
            return `email:${this.config.email}`;
        }
        return `phone:${this.config.phone}`;
    }

    private async verifyOtp(encryptedOtp: string) {
        if (this.config.clientTEEConnection == null) {
            throw new Error("Handshake parent not initialized");
        }

        const handshakeParent = this.config.clientTEEConnection;
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
}

export const DEFAULT_EVENT_OPTIONS = {
    timeoutMs: 10_000,
    intervalMs: 5_000,
};
