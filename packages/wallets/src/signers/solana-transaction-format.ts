const SIGNATURE_LENGTH = 64;

/** A versioned message sets the high bit of its first byte; the low seven bits hold the version. */
const VERSION_FLAG = 0x80;
const VERSION_MASK = 0x7f;

/** Read a compact-u16 (shortvec) at `offset`, returning its value and the bytes it occupied. */
function readCompactU16(bytes: Uint8Array, offset: number): { value: number; length: number } {
    let value = 0;
    let shift = 0;
    let cursor = offset;
    for (;;) {
        const byte = bytes[cursor];
        if (byte == null) {
            throw new Error("Malformed Solana transaction: the buffer ended inside a compact-u16");
        }
        cursor += 1;
        value |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) {
            break;
        }
        shift += 7;
    }
    return { value, length: cursor - offset };
}

/**
 * Slice the message out of a serialized transaction, past the signature array.
 * These are the bytes Ed25519 signs, so this also works for versions web3.js cannot re-serialize.
 */
export function extractMessageBytes(transactionBytes: Uint8Array): Uint8Array {
    const { value: signatureCount, length } = readCompactU16(transactionBytes, 0);
    const messageOffset = length + signatureCount * SIGNATURE_LENGTH;
    if (messageOffset >= transactionBytes.length) {
        throw new Error("Malformed Solana transaction: no message follows the signature array");
    }
    return transactionBytes.subarray(messageOffset);
}

/** The version these message bytes declare. Legacy messages carry no version and return null. */
export function messageVersion(messageBytes: Uint8Array): number | null {
    const prefix = messageBytes[0];
    if (prefix == null || (prefix & VERSION_FLAG) === 0) {
        return null;
    }
    return prefix & VERSION_MASK;
}
