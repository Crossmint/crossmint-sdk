import { Buffer } from "buffer";

/** Unsigned integer conversions for the bundled Solana token layouts, without native bindings. */
export function toBigIntBE(bytes: Uint8Array): bigint {
    let value = 0n;
    for (const byte of bytes) {
        value = (value << 8n) | BigInt(byte);
    }
    return value;
}

export function toBigIntLE(bytes: Uint8Array): bigint {
    let value = 0n;
    for (let index = bytes.length - 1; index >= 0; index--) {
        value = (value << 8n) | BigInt(bytes[index]);
    }
    return value;
}

export function toBufferBE(value: bigint, width: number): Buffer {
    if (typeof value !== "bigint") {
        throw new TypeError("Expected an unsigned bigint");
    }
    if (value < 0n) {
        throw new RangeError("Expected an unsigned bigint");
    }
    if (!Number.isSafeInteger(width) || width < 0) {
        throw new RangeError("Expected a nonnegative integer byte width");
    }

    const bytes = Buffer.alloc(width);
    if (width === 0) {
        return bytes;
    }

    // Preserve the previous browser converter's leading-hex-digit truncation when
    // callers supply a value larger than the requested width, including odd digits.
    const hexDigits = Math.ceil(value.toString(2).length / 4);
    let remaining = hexDigits > width * 2 ? value >> BigInt((hexDigits - width * 2) * 4) : value;
    for (let index = width - 1; index >= 0; index--) {
        bytes[index] = Number(remaining & 255n);
        remaining >>= 8n;
    }
    return bytes;
}

export function toBufferLE(value: bigint, width: number): Buffer {
    return toBufferBE(value, width).reverse();
}
