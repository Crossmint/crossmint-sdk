import { CrossmintAuthService } from "@/services/CrossmintAuthService";
import { JsonWebTokenError, JwtPayload, TokenExpiredError, decode, verify } from "jsonwebtoken";

import { getPublicKey } from "./tokenAuth/publicKey";

export async function verifyCrossmintSessionToken(apiKey: string, token: string) {
    const crossmintService = new CrossmintAuthService(apiKey);
    try {
        return await verifyJWTWithPublicKey(crossmintService, token);
    } catch (error) {
        throw new Error("Invalid token");
    }
}

async function verifyJWT(signingKey: string, token: string) {
    try {
        const verifiedToken = verify(token, signingKey);

        if (verifiedToken == null || typeof verifiedToken === "string") {
            throw new Error("Invalid token");
        }
        return verifiedToken;
    } catch (err: unknown) {
        if (err != null && err instanceof TokenExpiredError) {
            throw new Error(`JWT provided expired at timestamp ${err.expiredAt.toISOString()}`);
        }

        if (
            err != null &&
            err instanceof JsonWebTokenError &&
            (err.message.includes("invalid signature") || err.message.includes("invalid algorithm"))
        ) {
            throw new Error(err.message);
        }

        throw new Error("Invalid token");
    }
}

async function verifyJWTWithPublicKey(crossmintService: CrossmintAuthService, token: string) {
    const publicKey = await getPublicKey(token, crossmintService.getJWKSUri());

    return verifyJWT(publicKey, token);
}

export async function getJWTExpiration(token: string) {
    const decoded = decode(token, { complete: true }) as JwtPayload;
    if (decoded?.header == null) {
        throw new Error("Invalid Token: Header Formatted Incorrectly");
    }

    return decoded.payload.exp;
}
