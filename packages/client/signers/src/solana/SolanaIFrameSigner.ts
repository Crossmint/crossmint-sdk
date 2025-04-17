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
        await this.service.init();
    }

    /**
     * Connect to the wallet and get the user's address
     */
    public async connect(): Promise<string> {
        this._address = await this.service.connect();
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
 *
 * // Connect to the wallet
 * const address = await signer.connect();
 * console.log(`Connected to Solana wallet: ${address}`);
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
