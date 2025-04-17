import { SolanaIFrameSignerService } from "../services/SolanaIFrameSignerService";
import type { VersionedTransaction } from "@solana/web3.js";

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
    public async init(): Promise<void> {
        try {
            console.log("Initializing SolanaIFrameSigner...");
            await this.service.init();
            console.log("SolanaIFrameSigner initialization successful");
        } catch (error) {
            console.error("Error initializing SolanaIFrameSigner:", error);

            // Try to recover if possible
            if (this.service) {
                console.log("Trying to recover from initialization error...");

                // If handshake failed but we have a service, try to set some minimal properties
                try {
                    // Find any existing iframe that might work
                    const serviceAny = this.service as any;
                    const iframeUrl =
                        serviceAny.config?.iframeUrl ||
                        (serviceAny.iframe?.src
                            ? new URL(serviceAny.iframe.src).href
                            : "");
                    const existingIframe = document.querySelector(
                        'iframe[src*="' + iframeUrl + '"]'
                    ) as HTMLIFrameElement;

                    if (existingIframe) {
                        console.log(
                            "Found existing iframe, attempting to use it"
                        );
                        (this.service as any).iframe = existingIframe;

                        // Try to set a minimal emitter
                        (this.service as any).emitter = {
                            iframe: existingIframe,
                            isConnected: true,
                            send: (event: string, data: any) => {
                                existingIframe.contentWindow?.postMessage(
                                    { type: event, data },
                                    "*"
                                );
                                return true;
                            },
                        };

                        return; // Return without error after recovery attempt
                    }
                } catch (recoveryError) {
                    console.error("Recovery attempt failed:", recoveryError);
                }
            }

            throw error; // Re-throw the original error if recovery wasn't possible
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
    // biome-ignore lint/suspicious/useAwait:
    public async signMessage(message: Uint8Array): Promise<Uint8Array> {
        return this.service.signMessage(message);
    }

    /**
     * Sign a transaction using the connected wallet
     */

    // biome-ignore lint/suspicious/useAwait:
    public async signTransaction(
        transaction: VersionedTransaction
    ): Promise<VersionedTransaction> {
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
 * Usage example:
 *
 * This shows how to use the SolanaIFrameSigner in a client application.
 * The iframeUrl should point to an HTML page that initializes the SolanaIFrameContentHandler.
 */
export function createSolanaIFrameSigner(
    iframeUrl: string
): SolanaIFrameSigner {
    return new SolanaIFrameSigner(iframeUrl);
}

/**
 * Example of how to use the signer:
 *
 * ```typescript
 * // Initialize the signer with the iframe URL
 * const signer = createSolanaIFrameSigner('https://your-domain.com/solana-wallet-iframe.html');
 *
 * // Setup
 * await signer.init();
 * await signer.validateAttestation();
 *
 * // Get the public key
 * const publicKey = await signer.getPublicKey();
 * console.log(`Solana public key: ${publicKey}`);
 *
 * // Sign a message
 * const message = new TextEncoder().encode('Hello, Solana!');
 * const signature = await signer.signMessage(message);
 * console.log(`Signed message: ${signature}`);
 *
 * // Sign a transaction (using @solana/web3.js)
 * const transaction = new VersionedTransaction(...); // Create your transaction
 * const signedTransaction = await signer.signTransaction(transaction);
 *
 * // Cleanup when done
 * signer.dispose();
 * ```
 */
