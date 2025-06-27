import type { EncodingFormat } from "../../types";
import { encodeBase64, decodeBase64 } from "./base64";
import { encodeBase58, decodeBase58 } from "./base58";
import { encodeHex, decodeHex } from "./hex";

export * from "./base64";
export * from "./base58";
export * from "./hex";

export function encodeBytes(
    bytes: Uint8Array,
    encoding: EncodingFormat
): string {
    switch (encoding) {
        case "base58":
            return encodeBase58(bytes);
        case "hex":
            return encodeHex(bytes);
        case "base64":
            return encodeBase64(bytes);
        default:
            throw new Error(`Unsupported encoding: ${encoding}`);
    }
}

export function decodeBytes(
    encoded: string,
    encoding: EncodingFormat
): Uint8Array {
    switch (encoding) {
        case "base58":
            return decodeBase58(encoded);
        case "hex":
            return decodeHex(encoded);
        case "base64":
            return decodeBase64(encoded);
        default:
            throw new Error(`Unsupported encoding: ${encoding}`);
    }
}
