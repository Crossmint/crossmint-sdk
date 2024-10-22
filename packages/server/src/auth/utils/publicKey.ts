import { decode } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

export async function getPublicKey(token: string, jwksUri: string) {
    const decoded = decode(token, { complete: true });
    if (decoded?.header == null) {
        throw new Error("Invalid Token: Header Formatted Incorrectly");
    }

    const signingKey = await getSigningKey(jwksUri, decoded.header.kid);
    const publicKey = signingKey.getPublicKey();

    return publicKey;
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
        console.error("Error fetching signing key", error);
        throw new Error("Unable to retrieve signing key");
    }
}
