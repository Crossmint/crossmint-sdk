import { CrossmintService } from "@/services/CrossmintService";
import { JsonWebTokenError, TokenExpiredError, verify } from "jsonwebtoken";

import { getCachedPublicKey, getFetchedPublicKey } from "./tokenAuth/publicKey";

export async function verifyCrossmintSessionToken(apiKey: string, token: string) {
    const crossmintService = new CrossmintService(apiKey, token);
    try {
        return await verifyJWTWithPublicKey(crossmintService, "cached");
    } catch (error) {
        try {
            return await verifyJWTWithPublicKey(crossmintService, "fetched");
        } catch (error) {
            throw new Error("Invalid token");
        }
    }
}

async function verifyJWT(crossmintService: CrossmintService, signingKey: string) {
    try {
        if (crossmintService.jwtToken == null) {
            throw new Error("JWT token is null");
        }

        const verifiedToken = await verify(crossmintService.jwtToken, signingKey, { issuer: crossmintService.issuer });

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

async function verifyJWTWithPublicKey(crossmintService: CrossmintService, type: "cached" | "fetched") {
    if (crossmintService.jwtToken == null) {
        throw new Error("JWT token is null");
    }

    const publicKey =
        type === "cached"
            ? await getCachedPublicKey(crossmintService.jwtToken, crossmintService.getJWKSUri())
            : await getFetchedPublicKey(crossmintService.jwtToken, crossmintService.getJWKSUri());

    return verifyJWT(crossmintService, publicKey);
}
