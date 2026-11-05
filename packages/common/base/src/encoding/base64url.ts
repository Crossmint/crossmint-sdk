const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodes base64url (or standard base64), with or without padding. */
export function base64UrlToBytes(value: string): Uint8Array {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const char of normalized) {
        const index = BASE64_ALPHABET.indexOf(char);
        if (index === -1) {
            throw new Error(`Invalid base64 character "${char}"`);
        }
        buffer = (buffer << 6) | index;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }
    return new Uint8Array(bytes);
}

/** Encodes bytes as base64url without padding. */
export function bytesToBase64Url(bytes: Uint8Array): string {
    let output = "";
    let buffer = 0;
    let bits = 0;
    for (const byte of Array.from(bytes)) {
        buffer = (buffer << 8) | byte;
        bits += 8;
        while (bits >= 6) {
            bits -= 6;
            output += BASE64_ALPHABET[(buffer >> bits) & 0x3f];
        }
    }
    if (bits > 0) {
        output += BASE64_ALPHABET[(buffer << (6 - bits)) & 0x3f];
    }
    return output.replace(/\+/g, "-").replace(/\//g, "_");
}
