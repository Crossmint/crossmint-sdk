import { jwtVerify, errors, type createRemoteJWKSet } from "jose";

import { createJWKSClient } from "./jwksClient";

export async function verifyCrossmintJwt(token: string, jwksUri: string) {
    try {
        const jwks = createJWKSClient(jwksUri);
        return await verifyJWT(jwks, token);
    } catch (error) {
        throw error;
    }
}

async function verifyJWT(signingKey: ReturnType<typeof createRemoteJWKSet>, token: string) {
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
