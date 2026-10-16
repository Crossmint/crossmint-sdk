import { createRemoteJWKSet } from "jose";

const jwksClientsByUri = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function createJWKSClient(jwksUri: string) {
    const cachedJWKS = jwksClientsByUri.get(jwksUri);
    if (cachedJWKS != null) {
        return cachedJWKS;
    }

    try {
        const JWKS = createRemoteJWKSet(new URL(jwksUri), {
            cacheMaxAge: 600000, // Cache for 10 minutes (similar to jwks-rsa default)
        });

        jwksClientsByUri.set(jwksUri, JWKS);
        return JWKS;
    } catch (error) {
        console.error("Error creating JWKS client", error);
        throw new Error("Unable to create JWKS client");
    }
}
