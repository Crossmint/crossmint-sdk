export function encodeHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function decodeHex(hex: string): Uint8Array {
    return new Uint8Array(
        hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
    );
}
