import { decodeJwt, jwtVerify, errors, type createRemoteJWKSet, createLocalJWKSet, type JSONWebKeySet } from "jose";

import { CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";

import { createJWKSClient } from "./jwksClient";

/** A JWKS endpoint URI or an inline JSON Web Key Set. */
export type JWKSInput = string | JSONWebKeySet;

export type VerifyCrossmintJwtOptions = {
    /** Required Crossmint project ID the JWT must be issued for. */
    audience: string;
};

/**
 * Verify a Crossmint-issued JWT against the given JWKS (endpoint URI or key set) and return its decoded payload.
 * The JWT's `aud` claim must match `options.audience`.
 */
export async function verifyCrossmintJwt(token: string, jwks: JWKSInput, options: VerifyCrossmintJwtOptions) {
    if (typeof options?.audience !== "string" || options.audience.length === 0) {
        throw new Error(
            "verifyCrossmintJwt requires options.audience: the Crossmint project ID the JWT must be issued for"
        );
    }

    const signingKey = typeof jwks === "string" ? createJWKSClient(jwks) : createLocalJWKSet(jwks);
    return await verifyJWT(signingKey, token, options.audience);
}

/**
 * Assert that a JWT's `aud` claim matches the expected project ID. Decodes the token without verifying
 * its signature — only safe for tokens that come straight from Crossmint's refresh endpoint or the
 * integrator's own refresh route.
 */
export function assertJwtAudience(jwt: string, expectedAudience: string): void {
    try {
        const { aud } = decodeJwt(jwt);
        const matches =
            typeof aud === "string" ? aud === expectedAudience : Array.isArray(aud) && aud.includes(expectedAudience);
        if (!matches) {
            throw new Error("audience mismatch");
        }
    } catch {
        throw new CrossmintAuthenticationError("JWT audience does not match the expected project");
    }
}

async function verifyJWT(
    signingKey: ReturnType<typeof createRemoteJWKSet> | ReturnType<typeof createLocalJWKSet>,
    token: string,
    audience: string
) {
    try {
        const { payload } = await jwtVerify(token, signingKey, {
            audience,
            algorithms: ["RS256"],
            requiredClaims: ["exp", "sub", "aud"],
        });
        return payload;
    } catch (err: unknown) {
        if (err instanceof errors.JWTExpired) {
            const expiredAt = err.payload.exp;
            throw new Error(
                `JWT provided expired at timestamp ${expiredAt != null ? new Date(expiredAt * 1000).toISOString() : "unknown"}`
            );
        }
        if (err instanceof errors.JWSSignatureVerificationFailed) {
            throw new Error("signature verification failed");
        }
        if (err instanceof Error && err.message.includes("invalid algorithm")) {
            throw new Error("invalid algorithm");
        }
        throw err;
    }
}
