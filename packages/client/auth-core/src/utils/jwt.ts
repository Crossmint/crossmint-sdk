import { CrossmintAuthService } from "@/services/CrossmintAuthService";
import { JsonWebTokenError, TokenExpiredError, verify } from "jsonwebtoken";

import { getPublicKey } from "./tokenAuth/publicKey";

export async function verifyCrossmintSessionToken(apiKey: string, token: string) {
    const crossmintService = new CrossmintAuthService(apiKey, token);
    try {
        return await verifyJWTWithPublicKey(crossmintService);
    } catch (error) {
        throw new Error("Invalid token");
    }
}

async function verifyJWT(crossmintService: CrossmintAuthService, signingKey: string) {
    try {
        const verifiedToken = verify(crossmintService.jwtToken, signingKey);

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

async function verifyJWTWithPublicKey(crossmintService: CrossmintAuthService) {
    const publicKey = await getPublicKey(crossmintService.jwtToken, crossmintService.getJWKSUri());

    return verifyJWT(crossmintService, publicKey);
}
