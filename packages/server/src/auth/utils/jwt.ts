import { decodeJwt, jwtVerify, errors, type createRemoteJWKSet, createLocalJWKSet, type JSONWebKeySet } from "jose";

import { CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";

import { createJWKSClient } from "./jwksClient";

/** A JWKS endpoint URI or an inline JSON Web Key Set. */
export type JWKSInput = string | JSONWebKeySet;

export type VerifyCrossmintJwtOptions = {
    /** Expected `aud` claim: the project ID the JWT must be issued for. */
    audience?: string;
};

/**
 * Verify a Crossmint-issued JWT against the given JWKS (endpoint URI or key set) and return its decoded payload.
 * When `options.audience` is provided, the JWT's `aud` claim must match it.
 */
export async function verifyCrossmintJwt(token: string, jwks: JWKSInput, options: VerifyCrossmintJwtOptions = {}) {
    try {
        const signingKey = typeof jwks === "string" ? createJWKSClient(jwks) : createLocalJWKSet(jwks);
        return await verifyJWT(signingKey, token, options);
    } catch (error) {
        throw error;
    }
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
    options: VerifyCrossmintJwtOptions = {}
) {
    try {
        const { payload } =
            options.audience != null
                ? await jwtVerify(token, signingKey, {
                      audience: options.audience,
                      requiredClaims: ["exp", "sub", "aud"],
                  })
                : await jwtVerify(token, signingKey);
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
