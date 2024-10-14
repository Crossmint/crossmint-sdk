import jwt from "jsonwebtoken";

import { getPublicKey } from "./tokenAuth/publicKey";

export async function verifyCrossmintJwtToken(token: string, jwksUri: string) {
    try {
        const publicKey = await getPublicKey(token, jwksUri);
        return verifyJWT(publicKey, token);
    } catch (error) {
        console.log("Error verifying JWT", error);
        throw new Error("Invalid token");
    }
}

function verifyJWT(signingKey: string, token: string) {
    try {
        const verifiedToken = jwt.verify(token, signingKey);

        if (verifiedToken == null || typeof verifiedToken === "string") {
            throw new Error("Invalid token");
        }
        return verifiedToken;
    } catch (err: unknown) {
        if (err != null && err instanceof jwt.TokenExpiredError) {
            throw new Error(`JWT provided expired at timestamp ${err.expiredAt.toISOString()}`);
        }

        if (
            err != null &&
            err instanceof jwt.JsonWebTokenError &&
            (err.message.includes("invalid signature") || err.message.includes("invalid algorithm"))
        ) {
            throw new Error(err.message);
        }

        throw new Error("Invalid token");
    }
}
