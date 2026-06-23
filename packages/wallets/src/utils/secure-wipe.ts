/**
 * Securely wipe sensitive key material from memory by overwriting with zeros.
 * Accepts Uint8Array values or null/undefined (which are silently skipped).
 */
export function secureWipe(...buffers: (Uint8Array | null | undefined)[]): void {
    for (const buf of buffers) {
        if (buf != null) {
            buf.fill(0);
        }
    }
}
