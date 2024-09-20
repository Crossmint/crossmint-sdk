import { useCallback, useEffect, useRef } from "react";

import { CrossmintAuthService, getJWTExpiration } from "@crossmint/client-sdk-auth-core";

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
};

export function useRefreshToken({ crossmintAuthService, setAuthMaterial }: UseAuthTokenRefreshProps) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const refreshAuthMaterial = useCallback(() => {
        const refreshToken = getCookie(REFRESH_TOKEN_PREFIX);
        if (refreshToken != null) {
            crossmintAuthService
                .refreshAuthMaterial(refreshToken)
                .then((result) => {
                    setAuthMaterial(result);
                    return getJWTExpiration(result.jwtToken);
                })
                .then((jwtExpiration) => {
                    const currentTime = Date.now() / 1000;
                    const timeToExpire = jwtExpiration - currentTime - TIME_BEFORE_EXPIRING_JWT_IN_SECONDS;
                    if (timeToExpire > 0) {
                        timeoutRef.current = setTimeout(refreshAuthMaterial, timeToExpire * 1000);
                    }
                })
                .catch(console.error);
        }
    }, []);

    useEffect(() => {
        refreshAuthMaterial();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
}
