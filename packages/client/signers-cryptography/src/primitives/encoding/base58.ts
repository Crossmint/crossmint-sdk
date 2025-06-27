import bs58 from "bs58";

export function encodeBase58(bytes: Uint8Array): string {
    return bs58.encode(bytes);
}

export function decodeBase58(base58: string): Uint8Array {
    return bs58.decode(base58);
}
