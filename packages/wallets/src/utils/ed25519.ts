import { ed25519 } from "@noble/curves/ed25519";

/**
 * Derive an ed25519 keypair from a 32-byte seed and return the public key bytes
 * and the 64-byte secret key (seed || public key) used by ed25519Sign.
 */
export function ed25519KeypairFromSeed(seed: Uint8Array): {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
} {
    const publicKey = ed25519.getPublicKey(seed);
    // 64-byte secret key (seed || public key), copied so callers can wipe the seed afterwards.
    const secretKey = new Uint8Array(64);
    secretKey.set(seed, 0);
    secretKey.set(publicKey, 32);
    return { publicKey, secretKey };
}

/**
 * Sign a message using ed25519 (detached signature).
 * Takes the 64-byte secret key (seed || public key) returned by ed25519KeypairFromSeed.
 */
export function ed25519Sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return ed25519.sign(message, secretKey.subarray(0, 32));
}
