import { z } from "zod";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
    BaseAttestationValidator,
    Attestation,
} from "./AttestationValidationService";

export const AuthenticationDataSchema = z.object({
    signerAddress: z.string(),
    // TODO: add user-id, project-id, auth-id
});

// Define incoming events (events that the iframe sends to us)
export const ParentIncomingEvents = {
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
export const ParentOutgoingEvents = {
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
export type ParentIncomingEventMap = typeof ParentIncomingEvents;
export type ParentOutgoingEventMap = typeof ParentOutgoingEvents;

export interface SolanaIFrameSignerServiceConfig {
    iframeUrl: string;
    targetOrigin?: string;
}

/**
 * Placeholder encryption implementation
 * Uses the attestation public key to encrypt messages
 *
 * @param message - Data to encrypt
 * @param publicKey - Attestation public key for encryption
 * @returns Encrypted data (currently a placeholder)
 */
function encryptMessage(message: Uint8Array, publicKey: string): Uint8Array {
    // TODO: Replace with actual encryption implementation
    console.log(`Encrypting message with public key: ${publicKey}`);
    return message;
}

/**
 * Solana signer service that communicates with an iframe wallet
 * Extends the BaseAttestationValidator to require attestation validation
 * before performing any operations
 */
export class SolanaIFrameSignerService extends BaseAttestationValidator {
    private iframe: HTMLIFrameElement | null = null;
    private emitter: IFrameWindow<
        ParentIncomingEventMap,
        ParentOutgoingEventMap
    > | null = null;
    private config: SolanaIFrameSignerServiceConfig;
    private address: string | null = null;

    constructor(config: SolanaIFrameSignerServiceConfig) {
        super();
        this.config = config;
    }

    /**
     * Initializes communication with the iframe
     * Creates and configures the invisible iframe
     */
    public async init(): Promise<void> {
        if (this.emitter) {
            console.log("SolanaIFrameSignerService already initialized");
            return;
        }

        this.resetAttestationState();

        try {
            this.emitter = await IFrameWindow.init(this.config.iframeUrl, {
                incomingEvents: ParentIncomingEvents,
                outgoingEvents: ParentOutgoingEvents,
                targetOrigin: this.config.targetOrigin,
            });

            this.iframe = this.emitter.iframe;

            if (this.iframe && !document.body.contains(this.iframe)) {
                this.iframe.style.position = "absolute";
                this.iframe.style.width = "0";
                this.iframe.style.height = "0";
                this.iframe.style.border = "none";
                this.iframe.style.visibility = "hidden";
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
     * Implements the abstract method from BaseAttestationValidator
     */
    protected async requestAttestation(): Promise<Attestation> {
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

        this.ensureAttestationValidated();

        try {
            // Ensure we have an address
            if (!this.address) {
                this.address = await this.getPublicKey();
            }

            const publicKey = this.getAttestationPublicKey();
            if (!publicKey) {
                throw new Error("Attestation public key not available");
            }

            const encryptedMessage = encryptMessage(message, publicKey);

            const response = await this.emitter.sendAction({
                event: "request:sign-message",
                data: {
                    signerAddress: this.address,
                    message: bs58.encode(encryptedMessage),
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

        this.ensureAttestationValidated();

        try {
            // Ensure we have an address
            if (!this.address) {
                this.address = await this.getPublicKey();
            }

            const publicKey = this.getAttestationPublicKey();
            if (!publicKey) {
                throw new Error("Attestation public key not available");
            }

            const serializedTx = transaction.serialize();
            const encryptedTx = encryptMessage(serializedTx, publicKey);

            const response = await this.emitter.sendAction({
                event: "request:sign-transaction",
                data: {
                    signerAddress: this.address,
                    transaction: bs58.encode(encryptedTx),
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
        this.resetAttestationState();
    }
}
