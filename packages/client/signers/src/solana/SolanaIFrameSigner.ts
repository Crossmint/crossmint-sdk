import { IFrameWindow } from "@crossmint/client-sdk-window";
import { SolanaIFrameSignerService } from "../services/SolanaIFrameSignerService";
import type { VersionedTransaction } from "@solana/web3.js";
import { SecureIFrameParentIncomingEvents, SecureIFrameParentOutgoingEvents } from "../services/SolanaEvents";

/**
 * SolanaIFrameSigner is a signer implementation that uses an iframe for Solana wallet operations
 * This provides a clean interface that can be used by other components
 */
export class SolanaIFrameSigner {
    private service: SolanaIFrameSignerService;
    private _address: string | null = null;

    /**
     * Create a new SolanaIFrameSigner
     * @param iframeUrl URL of the iframe that contains the wallet implementation
     * @param targetOrigin Optional origin restriction for communication
     */
    constructor(iframeUrl: string, targetOrigin?: string) {
        this.service = new SolanaIFrameSignerService({
            iframeUrl,
            targetOrigin,
        });
    }

    /**
     * Initialize the signer
     */
    public async init(hidden = true): Promise<void> {
        try {
            console.log("Initializing SolanaIFrameSigner...");
            await this.service.init({ hidden });
            console.log("SolanaIFrameSigner initialization successful");
        } catch (error) {
            console.error("Error initializing SolanaIFrameSigner:", error);

            // Try to recover if possible
            if (this.service) {
                console.log("Trying to recover from initialization error...");

                try {
                    // Find any existing iframe that might work
                    const iframeUrl = this.service.getIFrameUrl() || new URL(this.service.getIFrame()?.src || "").href;

                    const existingIframe = document.querySelector(
                        'iframe[src*="' + iframeUrl + '"]'
                    ) as HTMLIFrameElement;

                    if (existingIframe) {
                        console.log("Found existing iframe, attempting to use it");
                        this.service.setIFrame(existingIframe);

                        // Create a proper IFrameWindow instance
                        // First, manually set the iframe source to match
                        const src = existingIframe.src || iframeUrl;
                        existingIframe.src = src;

                        // Then use init to create a proper IFrameWindow
                        const iframeWindow = IFrameWindow.init(src, {
                            incomingEvents: SecureIFrameParentIncomingEvents,
                            outgoingEvents: SecureIFrameParentOutgoingEvents,
                            targetOrigin: "*",
                        });

                        this.service.setEmitter(await iframeWindow);
                        return;
                    }
                } catch (recoveryError) {
                    console.error("Recovery attempt failed:", recoveryError);
                }
            }

            throw error;
        }
    }

    /**
     * Validate the attestation from the iframe wallet
     * This must be called before connect to ensure secure communication
     */
    public async validateAttestation(): Promise<boolean> {
        return await this.service.validateAttestation();
    }

    /**
     * Get the wallet's public key without connecting
     * This can be used to retrieve the public key from the iframe wallet
     * without requiring a full connection process
     */
    public async getPublicKey(): Promise<string> {
        // Store the public key in the address field for convenience
        this._address = await this.service.getPublicKey();
        return this._address;
    }

    /**
     * Get the current connected address
     */
    public get address(): string | null {
        return this._address;
    }

    /**
     * Sign a message using the connected wallet
     */
    public async signMessage(message: Uint8Array): Promise<Uint8Array> {
        return this.service.signMessage(message);
    }

    /**
     * Sign a transaction using the connected wallet
     */

    public async signTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction> {
        return this.service.signTransaction(transaction);
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.service.dispose();
        this._address = null;
    }
}

/**
 * This shows how to use the SolanaIFrameSigner in a client application.
 * The iframeUrl should point to an HTML page that initializes the SolanaIFrameContentHandler.
 */
export function createSolanaIFrameSigner(iframeUrl: string): SolanaIFrameSigner {
    return new SolanaIFrameSigner(iframeUrl);
}
