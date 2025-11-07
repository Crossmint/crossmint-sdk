/**
 * Typed error codes for signer operations.
 * These codes are returned in error responses from the frame to signal specific error conditions.
 */
export enum SignerErrorCode {
    /**
     * IndexedDB connection failed after all retries exhausted.
     * This signals that the WebView should be reloaded to recover from the fatal state.
     */
    IndexedDbFatal = "indexeddb-fatal",
}
