import { decode } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import PublicKeyCacheProvider from "../PublicKeyCacheProvider";

export async function getFetchedPublicKey(token: string, jwksUri: string) {
    console.log("Getting fetched public key from jwksUri", jwksUri);
    const decoded = decode(token, { complete: true });
    console.log("Decoded token", decoded);
    if (decoded?.header == null) {
        throw new Error("Invalid Token: Header Formatted Incorrectly");
    }

    const signingKey = await getSigningKey(jwksUri, decoded.header.kid);
    console.log("Signing key", signingKey);
    const publicKey = signingKey.getPublicKey();
    console.log("Setting cached public key in localStorage", publicKey);
    PublicKeyCacheProvider.setCachedPublicKey(publicKey);

    return publicKey;
}

export async function getCachedPublicKey(token: string, jwksUri: string) {
    const publicKey = PublicKeyCacheProvider.getCachedPublicKey();
    if (publicKey != null) {
        console.log("Cached public key found, returning cached public key");
        return publicKey;
    }

    console.log("No cached public key found, fetching from jwksUri");
    return getFetchedPublicKey(token, jwksUri);
}

async function getSigningKey(jwksUri: string, kid?: string) {
    const client = new JwksClient({
        jwksUri,
        cache: true,
    });

    console.log("Getting signing key from jwksUri", jwksUri);
    try {
        const signingKey = await client.getSigningKey(kid);
        console.log("Signing key found", signingKey);
        return signingKey;
    } catch (error) {
        console.log("Signing key not found, throwing error");
        console.error(error, "some error");
        throw new Error("Unable to retrieve signing key");
    }
}
