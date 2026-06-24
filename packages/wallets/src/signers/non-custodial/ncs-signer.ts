import type {
    BaseSignResult,
    EmailInternalSignerConfig,
    EmailSignerLocator,
    ExportSignerTEEConnection,
    PhoneInternalSignerConfig,
    PhoneSignerLocator,
    SignerAdapter,
} from "../types";
import {
    AuthRejectedError,
    KeyExportError,
    OnboardingSessionExpiredError,
    OtpValidationError,
    SignerStatusError,
} from "../types";
import { NcsIframeManager } from "./ncs-iframe-manager";
import { validateAPIKey, WithLoggerContext } from "@crossmint/common-sdk-base";
import type { SignerOutputEvent } from "@crossmint/client-signers";
import { walletsLogger } from "../../logger";

export abstract class NonCustodialSigner implements SignerAdapter {
    public readonly type: "email" | "phone";
    private _needsAuth = true;
    private _authPromise: {
        promise: Promise<void>;
        resolve: () => void;
        reject: (error: Error) => void;
    } | null = null;
    private _initializationPromise: Promise<void> | null = null;
    /**
     * The TEE connection generation that issued the in-flight OTP. Used to detect that the signer
     * frame was reloaded (losing the onboarding) between start-onboarding and complete-onboarding.
     */
    private _onboardingConnectionGeneration: number | null = null;

    constructor(protected config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        // Only initialize the signer if running client-side
        if (typeof window !== "undefined") {
            this._initializationPromise = this.initialize();
        }
        this.type = this.config.type;
    }

    locator(): EmailSignerLocator | PhoneSignerLocator {
        return this.config.locator;
    }

    address() {
        return this.config.address;
    }

    abstract signMessage(message: string): Promise<BaseSignResult>;

    private async initialize() {
        try {
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
        } finally {
            this._initializationPromise = null;
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
        walletsLogger.info("TEE connection not initialized, initializing now");

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

        walletsLogger.info("TEE connection initialized successfully");
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "handleAuthRequired",
    })
    protected async handleAuthRequired() {
        const clientTEEConnection = await this.getTEEConnection();

        if (this.config.onAuthRequired == null) {
            throw new Error(
                `${this.type} signer requires the onAuthRequired callback to handle OTP verification. ` +
                    `This callback manages the authentication flow (sending OTP and verifying user input). ` +
                    `If using our React/React Native SDK, this is handled automatically by the provider. ` +
                    `For other environments, implement: onAuthRequired: (needsAuth, sendOtp, verifyOtp, reject) => { /* your UI logic */ }`
            );
        }

        // Determine if we need to authenticate the user via OTP or not
        walletsLogger.info("get-status: sending request");
        const startTime = Date.now();
        const signerResponse = await clientTEEConnection.sendAction({
            event: "request:get-status",
            responseEvent: "response:get-status",
            data: {
                authData: {
                    jwt: this.config.crossmint.jwt ?? "",
                    apiKey: this.config.crossmint.apiKey,
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });
        const durationMs = Date.now() - startTime;

        if (signerResponse?.status !== "success") {
            const errorMessage =
                signerResponse?.status === "error"
                    ? signerResponse.error || "Failed to retrieve signer status"
                    : "Failed to retrieve signer status";
            const errorCode = signerResponse?.status === "error" ? signerResponse.code : undefined;
            walletsLogger.error("get-status: failed", {
                status: signerResponse?.status,
                error: signerResponse?.status === "error" ? signerResponse.error : undefined,
                code: errorCode,
                durationMs,
            });
            throw new SignerStatusError(errorMessage, errorCode);
        }

        walletsLogger.info("get-status: response received", {
            signerStatus: signerResponse.signerStatus,
            durationMs,
        });

        if (signerResponse.signerStatus === "ready") {
            this._needsAuth = false;
            return;
        } else {
            this._needsAuth = true;
        }

        walletsLogger.info("Auth required, initiating OTP flow", { needsAuth: this._needsAuth });

        const { promise, resolve, reject } = this.createAuthPromise();
        this._authPromise = { promise, resolve, reject };

        if (this.config.onAuthRequired) {
            try {
                await this.config.onAuthRequired(
                    this.config.type,
                    this.locator(),
                    this._needsAuth,
                    () => this.sendMessageWithOtp(),
                    (otp) => this.verifyOtp(otp),
                    async () => {
                        walletsLogger.info("Auth rejected", { authRejected: true });
                        this._needsAuth = false;
                        // We call onAuthRequired again so the needsAuth state is updated for the dev
                        if (this.config.onAuthRequired != null) {
                            await this.config.onAuthRequired(
                                this.config.type,
                                this.locator(),
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
        // Re-onboard the signer frame before each signature when the host provides a reset hook
        // (React Native on iOS). The signer webview's storage isn't reliable across launches there,
        // so we force a fresh device and OTP every time. No-op on other platforms, where the hook
        // is left undefined.
        if (this.config.resetSignerFrame != null) {
            await this.config.resetSignerFrame();
        }
        await this.handleAuthRequired();
    }

    protected getJwtOrThrow() {
        const jwt = this.config.crossmint.jwt;
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
        walletsLogger.info("start-onboarding: sending request");
        const startTime = Date.now();
        const response = await handshakeParent.sendAction({
            event: "request:start-onboarding",
            responseEvent: "response:start-onboarding",
            data: {
                authData: {
                    jwt: this.config.crossmint.jwt ?? "",
                    apiKey: this.config.crossmint.apiKey,
                },
                data: { authId },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });
        const durationMs = Date.now() - startTime;
        // Record which frame connection issued this OTP. If the frame reloads before the user enters
        // the code, the generation will have advanced and verifyOtp re-issues a fresh OTP.
        this._onboardingConnectionGeneration = handshakeParent.connectionGeneration;
        walletsLogger.info("start-onboarding: response received", {
            status: response?.status,
            durationMs,
        });

        if (response?.status === "success" && response.signerStatus === "ready") {
            this._needsAuth = false;
            return;
        }

        if (response?.status === "error") {
            walletsLogger.error("start-onboarding: failed", { error: response.error, code: response.code });
            // Throw rather than rejecting the auth promise directly: callers (the OTP UI and the
            // mid-onboarding re-issue path) catch this and decide how to surface it, so the dialog
            // state and the auth promise stay consistent.
            throw new OtpValidationError(response.error || "Failed to initiate OTP process.", response.code);
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
            walletsLogger.info("complete-onboarding: sending request");
            const startTime = Date.now();
            response = await handshakeParent.sendAction({
                event: "request:complete-onboarding",
                responseEvent: "response:complete-onboarding",
                data: {
                    authData: {
                        jwt: this.config.crossmint.jwt ?? "",
                        apiKey: this.config.crossmint.apiKey,
                    },
                    data: {
                        onboardingAuthentication: { encryptedOtp },
                    },
                },
                options: DEFAULT_EVENT_OPTIONS,
            });
            walletsLogger.info("complete-onboarding: response received", {
                status: response?.status,
                durationMs: Date.now() - startTime,
            });
        } catch (err) {
            walletsLogger.error("complete-onboarding: error", { error: err });
            return await this.handleOnboardingVerificationFailure(err as Error);
        }

        if (response?.status === "success") {
            this._needsAuth = false;
            // We call onAuthRequired again so the needsAuth state is updated for the dev
            if (this.config.onAuthRequired != null) {
                await this.config.onAuthRequired(
                    this.config.type,
                    this.locator(),
                    this._needsAuth,
                    () => this.sendMessageWithOtp(),
                    (otp) => this.verifyOtp(otp),
                    () => this._authPromise?.reject(new AuthRejectedError())
                );
            }
            this._authPromise?.resolve();
            return;
        }

        walletsLogger.error("complete-onboarding: OTP validation failed", {
            status: response?.status,
            error: response?.status === "error" ? response.error : undefined,
            code: response?.status === "error" ? response.code : undefined,
        });
        const errorMessage =
            response?.status === "error"
                ? response.error || "Failed to validate encrypted OTP"
                : "Failed to validate encrypted OTP";
        const errorCode = response?.status === "error" ? response.code : undefined;
        return await this.handleOnboardingVerificationFailure(new OtpValidationError(errorMessage, errorCode));
    }

    /**
     * Decide how to recover from a failed complete-onboarding. If the signer frame was reloaded since
     * the OTP was issued (its connection generation advanced), the in-memory onboarding is gone, so we
     * request a fresh OTP and surface {@link OnboardingSessionExpiredError} without rejecting the auth
     * promise — the flow stays alive for the user to enter the new code. Otherwise the OTP was simply
     * wrong, so we reject as before.
     */
    private async handleOnboardingVerificationFailure(error: Error): Promise<never> {
        this._needsAuth = true;

        const connection = this.config.clientTEEConnection;
        const frameReloaded =
            this._onboardingConnectionGeneration != null &&
            connection != null &&
            connection.connectionGeneration !== this._onboardingConnectionGeneration;

        if (frameReloaded) {
            walletsLogger.warn("complete-onboarding: signer frame reloaded mid-onboarding, re-issuing OTP", {
                onboardingGeneration: this._onboardingConnectionGeneration,
                currentGeneration: connection?.connectionGeneration,
            });
            // Re-run onboarding so the backend issues a fresh OTP against the reloaded frame. Only keep
            // the flow alive (via OnboardingSessionExpiredError) if a new code was actually sent; if the
            // re-issue itself fails, reject so the dialog doesn't sit open over a dead flow.
            try {
                await this.sendMessageWithOtp();
            } catch (reissueError) {
                this._authPromise?.reject(reissueError as Error);
                throw reissueError;
            }
            throw new OnboardingSessionExpiredError();
        }

        this._authPromise?.reject(error);
        throw error;
    }

    /**
     * Export the private key for this signer
     * @throws {Error} If signer is not authenticated
     */
    async _exportPrivateKey(
        exportTEEConnection: ExportSignerTEEConnection,
        onExport?: () => void | Promise<void>
    ): Promise<void> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        const { scheme, encoding } = this.getChainKeyParams();

        if (onExport != null) {
            const listenerId = exportTEEConnection.on("event:key-exported", (data) => {
                exportTEEConnection.off(listenerId);
                if (data.status !== "success") return;
                Promise.resolve()
                    .then(() => onExport())
                    .catch(() => {
                        console.error("[NCS Signer] onExport callback error");
                    });
            });
        }

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
                    walletAddress: this.config.address,
                    authId: this.getAuthId(),
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });

        if (response?.status === "error") {
            walletsLogger.error("export-signer: failed", {
                error: response.error,
                code: response.code,
            });
            throw new KeyExportError(response.error || "Failed to export private key", response.code);
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
