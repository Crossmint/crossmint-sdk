import { decode } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

import PublicKeyCacheProvider from "../PublicKeyCacheProvider";

export async function getFetchedPublicKey(token: string, jwksUri: string) {
    const decoded = decode(token, { complete: true });
    if (decoded?.header == null) {
        throw new Error("Invalid Token: Header Formatted Incorrectly");
    }

    const signingKey = await getSigningKey(jwksUri, decoded.header.kid);
    const publicKey = signingKey.getPublicKey();
    PublicKeyCacheProvider.setCachedPublicKey(publicKey);

    return publicKey;
}

export async function getCachedPublicKey(token: string, jwksUri: string) {
    const publicKey = PublicKeyCacheProvider.getCachedPublicKey();
    if (publicKey != null) {
        return publicKey;
    }

    return getFetchedPublicKey(token, jwksUri);
}

async function getSigningKey(jwksUri: string, kid?: string) {
    const client = new JwksClient({
        jwksUri,
        cache: true,
    });

    try {
        const signingKey = await client.getSigningKey(kid);
        return signingKey;
    } catch (error) {
        throw new Error("Unable to retrieve signing key");
    }
}
