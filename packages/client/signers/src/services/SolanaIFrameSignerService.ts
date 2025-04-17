import { z } from "zod";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

// Define incoming events (events that the iframe sends to us)
export const ParentIncomingEvents = {
    "response:connect": z.object({
        address: z.string(),
    }),
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
    error: z.object({
        code: z.number(),
        message: z.string(),
    }),
} as const;

// Define outgoing events (events that we send to the iframe)
export const ParentOutgoingEvents = {
    "request:connect": z.undefined(),
    "request:attestation": z.undefined(),
    "request:sign-message": z.object({
        address: z.string(),
        message: z.string(), // Base58 encoded message
    }),
    "request:sign-transaction": z.object({
        transaction: z.string(), // Base58 serialized transaction
    }),
} as const;

// Type definitions for our events
export type ParentIncomingEventMap = typeof ParentIncomingEvents;
export type ParentOutgoingEventMap = typeof ParentOutgoingEvents;

export interface SolanaIFrameSignerServiceConfig {
    iframeUrl: string;
    targetOrigin?: string;
}

export class SolanaIFrameSignerService {
    private iframe: HTMLIFrameElement | null = null;
    private emitter: IFrameWindow<
        ParentIncomingEventMap,
        ParentOutgoingEventMap
    > | null = null;
    private config: SolanaIFrameSignerServiceConfig;
    private address: string | null = null;

    constructor(config: SolanaIFrameSignerServiceConfig) {
        this.config = config;
    }

    /**
     * Initialize the iframe communication
     */
    public async init(): Promise<void> {
        if (this.emitter) {
            console.log("SolanaIFrameSignerService already initialized");
            return;
        }

        try {
            this.emitter = await IFrameWindow.init(this.config.iframeUrl, {
                incomingEvents: ParentIncomingEvents,
                outgoingEvents: ParentOutgoingEvents,
                targetOrigin: this.config.targetOrigin,
            });

            this.iframe = this.emitter.iframe;

            // Append iframe to document body if it's not already there
            if (this.iframe && !document.body.contains(this.iframe)) {
                // Make iframe invisible but functional
                this.iframe.style.position = "absolute";
                this.iframe.style.width = "0";
                this.iframe.style.height = "0";
                this.iframe.style.border = "none";
                this.iframe.style.visibility = "hidden";
                document.body.appendChild(this.iframe);
            }

            // Handshake with the iframe
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
     * Connect to the wallet in the iframe
     */
    public async connect(): Promise<string> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        try {
            const response = await this.emitter.sendAction({
                event: "request:connect",
                data: undefined,
                responseEvent: "response:connect",
            });

            this.address = response.address;
            return response.address;
        } catch (error) {
            console.error("Failed to connect to wallet", error);
            throw error;
        }
    }

    /**
     * Sign a message using the wallet in the iframe
     */
    public async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        if (!this.address) {
            throw new Error("Wallet not connected");
        }

        try {
            const response = await this.emitter.sendAction({
                event: "request:sign-message",
                data: {
                    address: this.address,
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
     * Sign a transaction using the wallet in the iframe
     */
    public async signTransaction(
        transaction: VersionedTransaction
    ): Promise<VersionedTransaction> {
        if (!this.emitter) {
            throw new Error("SolanaIFrameSignerService not initialized");
        }

        if (!this.address) {
            throw new Error("Wallet not connected");
        }

        try {
            const response = await this.emitter.sendAction({
                event: "request:sign-transaction",
                data: {
                    transaction: bs58.encode(transaction.serialize()),
                },
                responseEvent: "response:sign-transaction",
            });

            return {
                serialize: () => bs58.decode(response.transaction),
            } as VersionedTransaction;
        } catch (error) {
            console.error("Failed to sign transaction", error);
            throw error;
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.iframe && document.body.contains(this.iframe)) {
            document.body.removeChild(this.iframe);
        }
        this.iframe = null;
        this.emitter = null;
        this.address = null;
    }
}
