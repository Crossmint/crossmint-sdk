/**
 * Convert P-256 public key {x, y} hex coordinates to base64 uncompressed format.
 * Uncompressed format: 0x04 || X (32 bytes) || Y (32 bytes) = 65 bytes total.
 * This is the inverse of `parseUncompressedP256PublicKey` in sdk.ts.
 */
export function publicKeyToBase64(publicKey: { x: string; y: string }): string {
    const hexToBytes = (hex: string): Uint8Array => {
        const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
        const bytes = new Uint8Array(cleanHex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    };

    const xBytes = hexToBytes(publicKey.x);
    const yBytes = hexToBytes(publicKey.y);

    // Uncompressed P-256: 0x04 prefix + 32 bytes X + 32 bytes Y
    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(xBytes, 1 + (32 - xBytes.length)); // right-align to 32 bytes
    uncompressed.set(yBytes, 33 + (32 - yBytes.length)); // right-align to 32 bytes

    let binaryString = "";
    for (let i = 0; i < uncompressed.length; i++) {
        binaryString += String.fromCharCode(uncompressed[i]);
    }
    return btoa(binaryString);
}
