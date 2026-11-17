import { sha256 } from "@noble/hashes/sha256";
import { bytesToBase64Url } from "@crossmint/common-sdk-base";

export type PkcePair = {
    verifier: string;
    challenge: string;
};

/**
 * Creates a PKCE pair (RFC 7636) for an OAuth login.
 * Send the challenge when the login starts. Keep the verifier on the device and send it when you redeem the one-time secret.
 */
export function createPkcePair(): PkcePair {
    const verifier = bytesToBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
    return { verifier, challenge: getPkceChallenge(verifier) };
}

/**
 * Returns the S256 PKCE challenge for a verifier.
 */
export function getPkceChallenge(verifier: string): string {
    return bytesToBase64Url(sha256(new TextEncoder().encode(verifier)));
}
