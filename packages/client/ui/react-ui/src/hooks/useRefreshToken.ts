import { useCallback, useEffect, useRef } from "react";

import type { CrossmintAuthService } from "@crossmint/client-sdk-auth";
import { getJWTExpiration } from "@crossmint/client-sdk-auth";
import { queueTask, type CancellableTask } from "@crossmint/client-sdk-base";

import { REFRESH_TOKEN_PREFIX, getCookie } from "../utils/authCookies";

// 2 minutes before jwt expiration
const TIME_BEFORE_EXPIRING_JWT_IN_SECONDS = 120;

export type AuthMaterial = {
    jwtToken: string;
    refreshToken: {
        secret: string;
        expiresAt: string;
    };
};

type UseAuthTokenRefreshProps = {
    crossmintAuthService: CrossmintAuthService;
    setAuthMaterial: (authMaterial: AuthMaterial) => void;
    logout: () => void;
};

// Makes sure that everything inside the async IIFE has finished running before it can be called again.
// The actual promise just holds that IIFE until it has finished running and it's then set to null
let refreshPromise: Promise<void> | null = null;

export function useRefreshToken({ crossmintAuthService, setAuthMaterial, logout }: UseAuthTokenRefreshProps) {
    const refreshTaskRef = useRef<CancellableTask | null>(null);

    const refreshAuthMaterial = useCallback(() => {
        if (refreshPromise != null) {
            return refreshPromise;
        }

        const refreshToken = getCookie(REFRESH_TOKEN_PREFIX);
        if (refreshToken != null) {
            refreshPromise = (async () => {
                try {
                    const result = await crossmintAuthService.refreshAuthMaterial(refreshToken);
                    setAuthMaterial(result);
                    const jwtExpiration = getJWTExpiration(result.jwtToken);

                    if (jwtExpiration == null) {
                        throw new Error("Invalid JWT");
                    }

                    const currentTime = Date.now() / 1000;
                    const timeToExpire = jwtExpiration - currentTime - TIME_BEFORE_EXPIRING_JWT_IN_SECONDS;
                    if (timeToExpire > 0) {
                        const endTime = Date.now() + timeToExpire * 1000;
                        refreshTaskRef.current = queueTask(refreshAuthMaterial, endTime);
                    }
                } catch (error) {
                    logout();
                    console.error(error);
                } finally {
                    refreshPromise = null;
                }
            })();
        }
    }, []);

    useEffect(() => {
        refreshAuthMaterial();
        return () => {
            if (refreshTaskRef.current) {
                refreshTaskRef.current.cancel();
            }
        };
    }, []);
}
