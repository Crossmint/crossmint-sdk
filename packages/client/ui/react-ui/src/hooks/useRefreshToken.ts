import { useCallback, useEffect, useRef } from "react";

import type { CrossmintAuthService } from "@crossmint/client-sdk-auth-core/client";
import { getJWTExpiration } from "@crossmint/client-sdk-auth-core/client";

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

    const refreshAuthMaterial = useCallback(async () => {
        const refreshToken = getCookie(REFRESH_TOKEN_PREFIX);
        if (refreshToken != null) {
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
                    timeoutRef.current = setTimeout(refreshAuthMaterial, timeToExpire * 1000);
                }
            } catch (error) {
                console.error(error);
            }
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
