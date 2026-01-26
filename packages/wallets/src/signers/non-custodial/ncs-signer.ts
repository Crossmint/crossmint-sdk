import type {
    BaseSignResult,
    EmailInternalSignerConfig,
    ExportSignerTEEConnection,
    PhoneInternalSignerConfig,
    Signer,
} from "../types";
import { AuthRejectedError } from "../types";
import { NcsIframeManager } from "./ncs-iframe-manager";
import { validateAPIKey, WithLoggerContext } from "@crossmint/common-sdk-base";
import type { SignerOutputEvent } from "@crossmint/client-signers";
import { getStorage, type DeviceSignerStorage, type DeviceSigner } from "../device-signer";
import type { Chain } from "../../chains/chains";
import { walletsLogger } from "../../logger";

export abstract class NonCustodialSigner implements Signer {
    public readonly type: "email" | "phone";
    private _needsAuth = true;
    private _authPromise: {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } | null = null;
    private _initializationPromise: Promise<void> | null = null;
    protected deviceSigner?: DeviceSigner<Chain>;
    protected deviceSignerStorage?: DeviceSignerStorage;

    constructor(
        protected config: EmailInternalSignerConfig | PhoneInternalSignerConfig,
        deviceSignerStorage?: DeviceSignerStorage
    ) {
        // Only initialize the signer if running client-side
        if (typeof window !== "undefined") {
            this.deviceSignerStorage = deviceSignerStorage ?? getStorage();
            this.initialize();
        }
        this.type = this.config.type;
    }

    locator() {
        if (this.deviceSigner?.hasDeviceSigner()) {
            return this.deviceSigner.locator();
        }
        return this.config.locator;
    }

    address() {
        if (this.deviceSigner?.hasDeviceSigner()) {
            return this.deviceSigner.address();
        }
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
            const iframeManager = new NcsIframeManager({
                environment: parsedAPIKey.environment,
            });
            this.config.clientTEEConnection = await iframeManager.initialize();
        }
    }

    abstract signTransaction(transaction: string): Promise<{ signature: string }>;

    private async getTEEConnection() {
        if (this.config.clientTEEConnection == null) {
            // If there's already an initialization in progress, wait for it
            if (this._initializationPromise) {
                await this._initializationPromise;
                if (this.config.clientTEEConnection == null) {
                    throw new Error("Failed to initialize TEE connection");
                }
                return this.config.clientTEEConnection;
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

        if (this.config.clientTEEConnection == null) {
            throw new Error("TEE connection is not initialized");
        }
        return this.config.clientTEEConnection;
    }

    private async initializeTEEConnection(): Promise<void> {
        console.warn("TEE connection is not initialized, initializing now...");

        const parsedAPIKey = validateAPIKey(this.config.crossmint.apiKey);
        if (!parsedAPIKey.isValid) {
            throw new Error("Invalid API key");
        }
        const iframeManager = new NcsIframeManager({
            environment: parsedAPIKey.environment,
        });
        this.config.clientTEEConnection = await iframeManager.initialize();

        if (this.config.clientTEEConnection == null) {
            throw new Error("Failed to initialize TEE connection");
        }

        console.log("TEE connection initialized successfully");
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "handleAuthRequired",
    })
    protected async handleAuthRequired() {
        if (this.deviceSigner?.hasDeviceSigner()) {
            return;
        }

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
            options: DEFAULT_EVENT_OPTIONS,
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

        walletsLogger.info("Handling auth required", { signerResponse });
        walletsLogger.info("Needs auth", { needsAuth: this._needsAuth });
        walletsLogger.info("Config onAuthRequired", { onAuthRequired: this.config.onAuthRequired });

        const { promise, resolve, reject } = this.createAuthPromise();
        this._authPromise = { promise, resolve, reject };

        if (this.config.onAuthRequired) {
            try {
                await this.config.onAuthRequired(
                    this._needsAuth,
                    () => this.sendMessageWithOtp(),
                    (otp) => this.verifyOtp(otp),
                    async () => {
                        walletsLogger.info("Auth rejected", { authRejected: true });
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
                walletsLogger.error("handleAuthRequired error", { error });
                reject(error as Error);
            }
        }

        try {
            await promise;
        } catch (error) {
            walletsLogger.error("handleAuthRequired promise error", { error });
            throw error;
        }
    }

    public async ensureAuthenticated(): Promise<void> {
        await this.handleAuthRequired();
    }

    protected getJwtOrThrow() {
        const jwt = this.config.crossmint.experimental_customAuth?.jwt;
        if (jwt == null) {
            throw new Error("JWT is required");
        }
        return jwt;
    }

    private createAuthPromise(): {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } {
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
        let response: SignerOutputEvent<"complete-onboarding">;
        try {
            const handshakeParent = await this.getTEEConnection();
            response = await handshakeParent.sendAction({
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
        } catch (err) {
            console.error("[verifyOtp] Error sending OTP validation request:", err);
            this._needsAuth = true;
            this._authPromise?.reject(err as Error);
            throw err;
        }

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

        console.error("[verifyOtp] Failed to validate OTP:", JSON.stringify(response, null, 2));
        this._needsAuth = true;
        const errorMessage = response?.status === "error" ? response.error : "Failed to validate encrypted OTP";
        const error = new Error(errorMessage);
        this._authPromise?.reject(error);
        throw error;
    }

    /**
     * Export the private key for this signer
     * @throws {Error} If signer is not authenticated
     */
    async _exportPrivateKey(exportTEEConnection: ExportSignerTEEConnection): Promise<void> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        const { scheme, encoding } = this.getChainKeyParams();

        const response = await exportTEEConnection.sendAction({
            event: "request:export-signer",
            responseEvent: "response:export-signer",
            data: {
                authData: {
                    jwt,
                    apiKey: this.config.crossmint.apiKey,
                },
                data: {
                    scheme,
                    encoding,
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });

        if (response?.status === "error") {
            throw new Error(response.error || "Failed to export private key");
        }
    }

    /**
     * Get the appropriate scheme and encoding based on the chain
     * Must be implemented by concrete classes
     */
    protected abstract getChainKeyParams(): {
        scheme: "secp256k1" | "ed25519";
        encoding: "base58" | "hex" | "strkey";
    };
}

export const DEFAULT_EVENT_OPTIONS = {
    timeoutMs: 30_000,
};
