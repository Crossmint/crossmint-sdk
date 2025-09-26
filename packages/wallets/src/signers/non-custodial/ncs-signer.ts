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
    private _initializationPromise: Promise<void> | null = null;

    constructor(protected config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        this.initialize();
        this.type = this.config.type;
    }

    locator() {
        return this.config.locator;
    }

    address() {
        return this.config.address;
    }

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

    private async getTEEConnection() {
        if (this.config.clientTEEConnection == null) {
            // If there's already an initialization in progress, wait for it
            if (this._initializationPromise) {
                await this._initializationPromise;
                return this.config.clientTEEConnection!;
            }

            // Start initialization and store the promise to prevent concurrent initializations
            this._initializationPromise = this.initializeTEEConnection();

            try {
                await this._initializationPromise;
            } finally {
                // Clear the promise after completion (success or failure)
                this._initializationPromise = null;
            }
        }

        return this.config.clientTEEConnection!;
    }

    private async initializeTEEConnection(): Promise<void> {
        console.warn("TEE connection is not initialized, initializing now...");

        const parsedAPIKey = validateAPIKey(this.config.crossmint.apiKey);
        if (!parsedAPIKey.isValid) {
            throw new Error("Invalid API key");
        }
        const iframeManager = new NcsIframeManager({ environment: parsedAPIKey.environment });
        this.config.clientTEEConnection = await iframeManager.initialize();

        if (this.config.clientTEEConnection == null) {
            throw new Error("Failed to initialize TEE connection");
        }

        console.log("TEE connection initialized successfully");
    }

    protected async handleAuthRequired() {
        const clientTEEConnection = await this.getTEEConnection();

        if (this.config.onAuthRequired == null) {
            throw new Error(
                `${this.type} signer requires the onAuthRequired callback to handle OTP verification. ` +
                    `This callback manages the authentication flow (sending OTP and verifying user input). ` +
                    `If using our React/React Native SDK, this is handled automatically by the provider. ` +
                    `For other environments, implement: onAuthRequired: (needsAuth, sendEmailWithOtp, verifyOtp, reject) => { /* your UI logic */ }`
            );
        }

        // Determine if we need to authenticate the user via OTP or not
        const signerResponse = await clientTEEConnection.sendAction({
            event: "request:get-status",
            responseEvent: "response:get-status",
            data: {
                authData: {
                    jwt: this.config.crossmint.experimental_customAuth?.jwt ?? "",
                    apiKey: this.config.crossmint.apiKey,
                },
            },
            options: {
                ...DEFAULT_EVENT_OPTIONS,
                maxRetries: 5,
            },
        });

        if (signerResponse?.status !== "success") {
            throw new Error(signerResponse?.error);
        }

        if (signerResponse.signerStatus === "ready") {
            this._needsAuth = false;
            return;
        } else {
            this._needsAuth = true;
        }

        const { promise, resolve, reject } = this.createAuthPromise();
        this._authPromise = { promise, resolve, reject };

        if (this.config.onAuthRequired) {
            try {
                await this.config.onAuthRequired(
                    this._needsAuth,
                    () => this.sendMessageWithOtp(),
                    (otp) => this.verifyOtp(otp),
                    async () => {
                        this._needsAuth = false;
                        // We call onAuthRequired again so the needsAuth state is updated for the dev
                        if (this.config.onAuthRequired != null) {
                            await this.config.onAuthRequired(
                                this._needsAuth,
                                () => this.sendMessageWithOtp(),
                                (otp) => this.verifyOtp(otp),
                                () => this._authPromise?.reject(new AuthRejectedError())
                            );
                        }
                        reject(new AuthRejectedError());
                    }
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
        const handshakeParent = await this.getTEEConnection();
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
            options: {
                ...DEFAULT_EVENT_OPTIONS,
                maxRetries: 3,
            },
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
        const handshakeParent = await this.getTEEConnection();
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
                options: {
                    ...DEFAULT_EVENT_OPTIONS,
                    maxRetries: 3,
                },
            });

            if (response?.status === "success") {
                this._needsAuth = false;
                // We call onAuthRequired again so the needsAuth state is updated for the dev
                if (this.config.onAuthRequired != null) {
                    await this.config.onAuthRequired(
                        this._needsAuth,
                        () => this.sendMessageWithOtp(),
                        (otp) => this.verifyOtp(otp),
                        () => this._authPromise?.reject(new AuthRejectedError())
                    );
                }
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
