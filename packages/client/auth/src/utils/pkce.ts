import { sha256 } from "@noble/hashes/sha256";

export type PkcePair = {
    verifier: string;
    challenge: string;
};

/**
 * Creates a PKCE pair (RFC 7636) for an OAuth login.
 * Send the challenge when the login starts. Keep the verifier on the device and send it when you redeem the one-time secret.
 */
export function createPkcePair(): PkcePair {
    const verifier = toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
    return { verifier, challenge: getPkceChallenge(verifier) };
}

/**
 * Returns the S256 PKCE challenge for a verifier.
 */
export function getPkceChallenge(verifier: string): string {
    return toBase64Url(sha256(new TextEncoder().encode(verifier)));
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
