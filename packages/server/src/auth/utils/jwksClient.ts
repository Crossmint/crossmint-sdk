import { createRemoteJWKSet, jwksCache, type JWKSCacheInput, type JWTVerifyGetKey } from "jose";

/** Keys older than this are re-downloaded in the background; verification keeps using them meanwhile. */
const REFRESH_AFTER_MS = 10 * 60 * 1000;
/** While the endpoint fails, keys stay in use up to this age; past it, verification waits for a download. */
const MAX_STALE_MS = 60 * 60 * 1000;
/** Minimum gap between background refresh attempts, so a failing endpoint is not called on every request. */
const REFRESH_RETRY_MS = 30 * 1000;

const jwksClientsByUri = new Map<string, JWTVerifyGetKey>();

export function createJWKSClient(jwksUri: string): JWTVerifyGetKey {
    const cachedJWKS = jwksClientsByUri.get(jwksUri);
    if (cachedJWKS != null) {
        return cachedJWKS;
    }

    try {
        const JWKS = createRefreshingJWKS(new URL(jwksUri));
        jwksClientsByUri.set(jwksUri, JWKS);
        return JWKS;
    } catch (error) {
        console.error("Error creating JWKS client", error);
        throw new Error("Unable to create JWKS client");
    }
}

/**
 * A remote key set that never makes a verification wait for a routine refresh: only the first download, a
 * token signed with a key it has not seen (rotation), or keys past MAX_STALE_MS block.
 */
function createRefreshingJWKS(url: URL): JWTVerifyGetKey {
    // Age is tracked here, not by jose, which still re-downloads on its own for an unknown key id. jose stamps
    // `uat` on this cache after every successful download, its own included, so the age covers both.
    const cache: JWKSCacheInput = {};
    const remote = createRemoteJWKSet(url, { cacheMaxAge: Number.POSITIVE_INFINITY, [jwksCache]: cache });
    let refreshAttemptedAt = Number.NEGATIVE_INFINITY;

    return async (protectedHeader, token) => {
        const age = "uat" in cache ? Date.now() - cache.uat : Number.POSITIVE_INFINITY;
        if (age > MAX_STALE_MS) {
            await remote.reload();
        } else if (age > REFRESH_AFTER_MS && Date.now() - refreshAttemptedAt > REFRESH_RETRY_MS) {
            refreshAttemptedAt = Date.now();
            // A failed refresh keeps the current keys; the next verification after REFRESH_RETRY_MS retries.
            remote.reload().catch(() => {});
        }
        return remote(protectedHeader, token);
    };
}
