import { z } from "zod";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
    type AttestationValidationService,
    AttestationValidationServiceImpl,
    type Attestation,
} from "./AttestationValidationService";
import {
    type AsymmetricEncryptionService,
    AsymmetricEncryptionServiceImpl,
} from "./AsymmetricEncryptionService";

export const AuthenticationDataSchema = z.object({
    signerAddress: z.string(),
    // TODO: add user-id, project-id, auth-id
});

// Define incoming events (events that the iframe sends o us)
export const SecureIFrameParentIncomingEvents = {
    "response:sign-message": z.object({
        address: z.string(),
        signature: z.string(),
    }),
    "response:sign-transaction": z.object({
        transaction: z.string(), // Base58 serialized transaction
    }),
    "response:attestation": z.object({
        attestation: z.record(z.string(), z.any()),
    }),
    "response:get-public-key": z.object({
        publicKey: z.string(),
    }),
    error: z.object({
        code: z.number(),
        message: z.string(),
    }),
} as const;

// Define outgoing events (events that we send to the iframe)
export const SecureIFrameParentOutgoingEvents = {
    "request:attestation": z.undefined(),
    "request:sign-message": AuthenticationDataSchema.extend({
        message: z.string(), // Base58 encoded message
    }),
    "request:sign-transaction": AuthenticationDataSchema.extend({
        transaction: z.string(), // Base58 serialized transaction
    }),
    "request:get-public-key": z.object({}),
} as const;

// Type definitions for our events
export type ParentIncomingEventMap = typeof SecureIFrameParentIncomingEvents;
export type ParentOutgoingEventMap = typeof SecureIFrameParentOutgoingEvents;

export interface SolanaIFrameSignerServiceConfig {
    iframeUrl: string;
    targetOrigin?: string;
    attestationValidationService?: AttestationValidationService;
    encryptionService?: AsymmetricEncryptionService;
}

/**
 * Interface for asymmetric encryption operations in the IFrameSignerService
 */
export interface AsymmetricEncryptionProvider {
    /**
     * Encrypts data using the attestation public key
     * @param data The data to encrypt
     * @returns The encrypted data
     */
    encryptData(data: Uint8Array): Uint8Array;
}

/**
 * Solana signer service that communicates with an iframe wallet
 * Uses the AttestationValidationService to validate attestations
 * before performing any operations
 */
export class SolanaIFrameSignerService implements AsymmetricEncryptionProvider {
    private iframe: HTMLIFrameElement | null = null;
    private emitter: IFrameWindow<
        ParentIncomingEventMap,
        ParentOutgoingEventMap
    > | null = null;
    private config: SolanaIFrameSignerServiceConfig;
    private address: string | null = null;
    private attestationService: AttestationValidationService;
    private encryptionService: AsymmetricEncryptionService;

    constructor(config: SolanaIFrameSignerServiceConfig) {
        this.config = config;

        // Use provided services or create default ones
        this.encryptionService =
            config.encryptionService || new AsymmetricEncryptionServiceImpl();

        // Create the attestation service with a requestAttestation function
        this.attestationService =
            config.attestationValidationService ||
            new AttestationValidationServiceImpl(
                this.requestAttestation.bind(this)
            );
    }

    /**
     * Initializes communication with the iframe
     * Creates and configures the invisible iframe
     */
    public async init({ hidden = true } = {}): Promise<void> {
        if (this.emitter) {
            console.log("SolanaIFrameSignerService already initialized");
            return;
        }

        this.attestationService.resetAttestationState();

        try {
            this.emitter = await IFrameWindow.init(this.config.iframeUrl, {
                incomingEvents: SecureIFrameParentIncomingEvents,
                outgoingEvents: SecureIFrameParentOutgoingEvents,
                targetOrigin: this.config.targetOrigin,
            });

            this.iframe = this.emitter.iframe;
            if (this.iframe != null && hidden) {
                this.iframe.style.display = "none";
                this.iframe.style.position = "absolute";
                this.iframe.style.width = "0";
                this.iframe.style.height = "0";
                this.iframe.style.border = "none";
                this.iframe.style.visibility = "hidden";
                this.iframe.style.opacity = "0";
                this.iframe.style.pointerEvents = "none";
                this.iframe.style.clip = "rect(0, 0, 0, 0)";
                this.iframe.style.overflow = "hidden";
                this.iframe.setAttribute("aria-hidden", "true");
                this.iframe.setAttribute("tabindex", "-1");
            }

            if (this.iframe && !document.body.contains(this.iframe)) {
                document.body.appendChild(this.iframe);
            }

            await this.emitter.handshakeWithChild();
            console.log("Handshake with SolanaIFrameSignerService complete");
        } catch (error) {
            console.error(
                "Failed to initialize SolanaIFrameSignerService",
                error
            );
            throw error;
        }
    }

    /**
     * Requests attestation from the iframe
     * Used by the AttestationValidationService
     */
    private async requestAttestation(): Promise<Attestation> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        const response = await this.emitter.sendAction({
            event: "request:attestation",
            data: undefined,
            responseEvent: "response:attestation",
        });

        const attestation: Attestation = {
            ...response.attestation,
            publicKey: response.attestation.publicKey || "missing-public-key",
        };

        return attestation;
    }

    /**
     * Validates the attestation for this service
     * @returns Promise resolving to true if attestation was validated
     */
    public async validateAttestation(): Promise<boolean> {
        return this.attestationService.validateAttestation();
    }

    /**
     * Encrypts data using the attestation public key
     * Implements the AsymmetricEncryptionProvider interface
     *
     * @param data The data to encrypt
     * @returns The encrypted data
     */
    public encryptData(data: Uint8Array): Uint8Array {
        const publicKey = this.attestationService.getAttestationPublicKey();
        if (!publicKey) {
            throw new Error("Attestation public key not available");
        }

        return this.encryptionService.encrypt(data, publicKey);
    }

    /**
     * Signs a message using the iframe wallet
     * Message is encrypted with the attestation public key
     *
     * @param message - The message to sign
     * @returns The signature as a Uint8Array
     */
    public async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        this.attestationService.ensureAttestationValidated();

        try {
            // Ensure we have an address
            if (!this.address) {
                this.address = await this.getPublicKey();
            }

            const response = await this.emitter.sendAction({
                event: "request:sign-message",
                data: {
                    signerAddress: this.address,
                    message: bs58.encode(message),
                },
                responseEvent: "response:sign-message",
            });

            return bs58.decode(response.signature);
        } catch (error) {
            console.error("Failed to sign message", error);
            throw error;
        }
    }

    /**
     * Signs a transaction using the iframe wallet
     * Transaction is encrypted with the attestation public key
     *
     * @param transaction - The transaction to sign
     * @returns The signed transaction
     */
    public async signTransaction(
        transaction: VersionedTransaction
    ): Promise<VersionedTransaction> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        this.attestationService.ensureAttestationValidated();

        try {
            // Ensure we have an address
            if (!this.address) {
                this.address = await this.getPublicKey();
            }

            const serializedTx = transaction.serialize();

            const response = await this.emitter.sendAction({
                event: "request:sign-transaction",
                data: {
                    signerAddress: this.address,
                    transaction: bs58.encode(serializedTx),
                },
                responseEvent: "response:sign-transaction",
            });

            return VersionedTransaction.deserialize(
                bs58.decode(response.transaction)
            );
        } catch (error) {
            console.error("Failed to sign transaction", error);
            throw error;
        }
    }

    /**
     * Gets the public key from the iframe wallet
     * This can be used to fetch the public key without connecting to the wallet
     * @returns The wallet's public key
     */
    public async getPublicKey(): Promise<string> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        try {
            const response = await this.emitter.sendAction({
                event: "request:get-public-key",
                data: {},
                responseEvent: "response:get-public-key",
            });

            return response.publicKey;
        } catch (error) {
            console.error("Failed to get public key from wallet", error);
            throw error;
        }
    }

    getIFrameUrl(): string | null {
        return this.config?.iframeUrl || this.iframe?.src || null;
    }

    getIFrame(): HTMLIFrameElement | null {
        return this.iframe;
    }

    setIFrame(iframe: HTMLIFrameElement): void {
        this.iframe = iframe;
    }

    setEmitter(
        emitter: IFrameWindow<ParentIncomingEventMap, ParentOutgoingEventMap>
    ): void {
        this.emitter = emitter;
    }

    /**
     * Cleans up resources and resets state
     */
    public dispose(): void {
        if (this.iframe && document.body.contains(this.iframe)) {
            document.body.removeChild(this.iframe);
        }
        this.iframe = null;
        this.emitter = null;
        this.address = null;
        this.attestationService.resetAttestationState();
    }
}
