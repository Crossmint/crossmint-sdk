import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

const HKDF_SALT = "crossmint";
const SECRET_PREFIX = "xmsk1_";

/**
 * Derives a chain-specific private key from a master secret using HKDF-SHA256.
 *
 * The derivation is deterministic: same secret + same project + same environment + same chain
 * always produces the same private key.
 *
 * @param secret - Master secret (with or without xmsk1_ prefix), 64-char hex
 * @param projectId - Project ID from the API key
 * @param environment - Environment from the API key (staging, production)
 * @param chain - Chain identifier (e.g., "base-sepolia", "ethereum")
 * @returns Raw 32-byte derived key
 */
export function deriveKeyBytes(secret: string, projectId: string, environment: string, chain: string): Uint8Array {
    const rawSecret = stripAndValidateSecret(secret);
    const ikm = hexToBytes(rawSecret);
    const algorithm = getAlgorithmForChain(chain);
    const info = `${projectId}:${environment}:${chain}-${algorithm}`;

    return hkdf(sha256, ikm, HKDF_SALT, info, 32);
}

/**
 * Derives a deterministic wallet alias from a master secret.
 * Uses the same derivation path so the alias is always recoverable.
 */
export function deriveAlias(secret: string, projectId: string, environment: string, chain: string): string {
    const rawSecret = stripAndValidateSecret(secret);
    const ikm = hexToBytes(rawSecret);
    const info = `${projectId}:${environment}:${chain}-alias`;

    // Alias max length is 36 chars. "s-" prefix (2) + 34 hex chars = 36.
    const derived = hkdf(sha256, ikm, HKDF_SALT, info, 17);
    return `s-${bytesToHex(derived).slice(0, 34)}`;
}

const EXPECTED_SECRET_LENGTH = 64; // 32 bytes = 256 bits of entropy

function stripAndValidateSecret(secret: string): string {
    const rawSecret = secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret;
    if (rawSecret.length !== EXPECTED_SECRET_LENGTH) {
        throw new Error(
            `Invalid server signer secret: expected ${EXPECTED_SECRET_LENGTH}-char hex string (256-bit), got ${rawSecret.length} chars`
        );
    }
    return rawSecret;
}

function getAlgorithmForChain(chain: string): string {
    if (chain === "solana") {
        return "ed25519";
    }
    if (chain === "stellar") {
        return "ed25519";
    }
    return "secp256k1";
}

function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error(`Invalid hex string: odd length (${hex.length})`);
    }
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
        throw new Error("Invalid hex string: contains non-hex characters");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}
