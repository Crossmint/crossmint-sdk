import { p256 } from "@noble/curves/p256";
import { bytesToHex } from "@noble/curves/abstract/utils";
import type { PasskeySignResult } from "@crossmint/wallets-sdk";

// Converts the WebAuthn JSON that native passkey APIs return (base64url fields, a DER signature,
// a CBOR attestation) into the shapes the wallet SDK expects from `ox` in the browser.

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const P256_UNCOMPRESSED_POINT_LENGTH = 65;
const COSE_KEY_X = -2;
const COSE_KEY_Y = -3;

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

/** Encodes bytes as base64url without padding, as WebAuthn JSON does. */
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

/** The challenge as WebAuthn JSON takes it: the SDK passes it as hex (`0x…`), the native API wants base64url. */
export function hexChallengeToBase64Url(challenge: string): string {
    const hex = challenge.startsWith("0x") ? challenge.slice(2) : challenge;
    if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
        throw new Error("The passkey challenge must be a hex string");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytesToBase64Url(bytes);
}

/** UTF-8 decoding without `TextDecoder`, which Hermes does not always provide. */
export function utf8Decode(bytes: Uint8Array): string {
    let output = "";
    for (let i = 0; i < bytes.length; ) {
        const byte = bytes[i];
        let codePoint: number;
        let length: number;
        if (byte < 0x80) {
            codePoint = byte;
            length = 1;
        } else if (byte >= 0xc0 && byte < 0xe0) {
            codePoint = byte & 0x1f;
            length = 2;
        } else if (byte >= 0xe0 && byte < 0xf0) {
            codePoint = byte & 0x0f;
            length = 3;
        } else {
            codePoint = byte & 0x07;
            length = 4;
        }
        for (let j = 1; j < length; j++) {
            codePoint = (codePoint << 6) | (bytes[i + j] & 0x3f);
        }
        output += String.fromCodePoint(codePoint);
        i += length;
    }
    return output;
}

/**
 * The passkey's P-256 public key as decimal `{ x, y }`, from a registration result: the SPKI `publicKey`
 * when the platform returns it, otherwise the COSE key inside the CBOR `attestationObject`.
 */
export function publicKeyFromRegistration(response: { publicKey?: string; attestationObject: string }): {
    x: string;
    y: string;
} {
    const point =
        response.publicKey != null && response.publicKey !== ""
            ? pointFromSpki(base64UrlToBytes(response.publicKey))
            : pointFromAttestationObject(base64UrlToBytes(response.attestationObject));
    // Throws when the bytes are not a point on P-256.
    const { x, y } = p256.ProjectivePoint.fromHex(point).toAffine();
    return { x: x.toString(), y: y.toString() };
}

/** A P-256 SPKI ends with the 65-byte uncompressed point `04 || x || y`. */
function pointFromSpki(spki: Uint8Array): Uint8Array {
    const point = spki.slice(spki.length - P256_UNCOMPRESSED_POINT_LENGTH);
    if (point.length !== P256_UNCOMPRESSED_POINT_LENGTH || point[0] !== 0x04) {
        throw new Error("The passkey public key is not an uncompressed P-256 key");
    }
    return point;
}

/**
 * authenticatorData = rpIdHash (32) || flags (1) || signCount (4) || aaguid (16) || credentialIdLength (2)
 * || credentialId || COSE public key (CBOR map; -2 is x, -3 is y).
 */
function pointFromAttestationObject(attestationObject: Uint8Array): Uint8Array {
    const attestation = decodeCbor(attestationObject).value as Map<unknown, unknown>;
    const authData = attestation.get("authData");
    if (!(authData instanceof Uint8Array)) {
        throw new Error("The passkey attestation has no authenticator data");
    }
    const credentialIdLength = (authData[53] << 8) | authData[54];
    const coseKey = decodeCbor(authData, 55 + credentialIdLength).value as Map<unknown, unknown>;
    const x = coseKey.get(COSE_KEY_X);
    const y = coseKey.get(COSE_KEY_Y);
    if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array) || x.length !== 32 || y.length !== 32) {
        throw new Error("The passkey attestation has no P-256 public key");
    }
    const point = new Uint8Array(P256_UNCOMPRESSED_POINT_LENGTH);
    point[0] = 0x04;
    point.set(x, 1);
    point.set(y, 33);
    return point;
}

/** The subset of CBOR that WebAuthn attestations use: integers, byte and text strings, arrays, maps, simple values. */
function decodeCbor(bytes: Uint8Array, offset = 0): { value: unknown; offset: number } {
    const initial = bytes[offset];
    const majorType = initial >> 5;
    const additional = initial & 0x1f;
    let position = offset + 1;
    let argument: number;
    if (additional < 24) {
        argument = additional;
    } else if (additional <= 27) {
        const size = 1 << (additional - 24);
        argument = 0;
        for (let i = 0; i < size; i++) {
            argument = argument * 256 + bytes[position + i];
        }
        position += size;
    } else {
        throw new Error("Unsupported CBOR encoding in the passkey attestation");
    }
    switch (majorType) {
        case 0:
            return { value: argument, offset: position };
        case 1:
            return { value: -1 - argument, offset: position };
        case 2:
            return { value: bytes.slice(position, position + argument), offset: position + argument };
        case 3:
            return { value: utf8Decode(bytes.slice(position, position + argument)), offset: position + argument };
        case 4: {
            const items: unknown[] = [];
            for (let i = 0; i < argument; i++) {
                const item = decodeCbor(bytes, position);
                items.push(item.value);
                position = item.offset;
            }
            return { value: items, offset: position };
        }
        case 5: {
            const entries = new Map<unknown, unknown>();
            for (let i = 0; i < argument; i++) {
                const key = decodeCbor(bytes, position);
                const entry = decodeCbor(bytes, key.offset);
                entries.set(key.value, entry.value);
                position = entry.offset;
            }
            return { value: entries, offset: position };
        }
        case 7:
            return { value: argument === 21 ? true : argument === 20 ? false : null, offset: position };
        default:
            throw new Error("Unsupported CBOR type in the passkey attestation");
    }
}

/**
 * The wallet SDK's passkey signature from a native assertion: `{ r, s }` as hex with `s` in low-S form (the
 * DER signature is parsed), and the same `metadata` that `ox`'s `WebAuthnP256.sign` produces in the browser.
 */
export function toPasskeySignResult(response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
}): PasskeySignResult {
    const signature = p256.Signature.fromDER(bytesToHex(base64UrlToBytes(response.signature))).normalizeS();
    const clientDataJSON = utf8Decode(base64UrlToBytes(response.clientDataJSON));
    return {
        signature: { r: `0x${signature.r.toString(16)}`, s: `0x${signature.s.toString(16)}` },
        metadata: {
            authenticatorData: `0x${bytesToHex(base64UrlToBytes(response.authenticatorData))}`,
            clientDataJSON,
            challengeIndex: clientDataJSON.indexOf('"challenge"'),
            typeIndex: clientDataJSON.indexOf('"type"'),
            userVerificationRequired: true,
        },
    };
}
