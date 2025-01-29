import { createRemoteJWKSet } from "jose";

export function createJWKSClient(jwksUri: string) {
    try {
        const JWKS = createRemoteJWKSet(new URL(jwksUri), {
            cacheMaxAge: 600000, // Cache for 10 minutes (similar to jwks-rsa default)
        });

        return JWKS;
    } catch (error) {
        console.error("Error creating JWKS client", error);
        throw new Error("Unable to create JWKS client");
    }
}
