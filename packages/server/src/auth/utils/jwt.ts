import { jwtVerify, errors, type createRemoteJWKSet, createLocalJWKSet, type JSONWebKeySet } from "jose";

import { createJWKSClient } from "./jwksClient";

/** A JWKS endpoint URI or an inline JSON Web Key Set. */
export type JWKSInput = string | JSONWebKeySet;

/** Verify a Crossmint-issued JWT against the given JWKS (endpoint URI or key set) and return its decoded payload. */
export async function verifyCrossmintJwt(token: string, jwks: JWKSInput) {
    try {
        const signingKey = typeof jwks === "string" ? createJWKSClient(jwks) : createLocalJWKSet(jwks);
        return await verifyJWT(signingKey, token);
    } catch (error) {
        throw error;
    }
}

async function verifyJWT(
    signingKey: ReturnType<typeof createRemoteJWKSet> | ReturnType<typeof createLocalJWKSet>,
    token: string
) {
    try {
        const { payload } = await jwtVerify(token, signingKey);
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
