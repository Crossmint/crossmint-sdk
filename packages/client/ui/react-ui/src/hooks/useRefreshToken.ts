import { useCallback, useEffect, useRef } from "react";

import type { CrossmintAuthService } from "@crossmint/client-sdk-auth-core/client";
import { getJWTExpiration } from "@crossmint/client-sdk-auth-core/client";
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

export function useRefreshToken({ crossmintAuthService, setAuthMaterial, logout }: UseAuthTokenRefreshProps) {
    const refreshTaskRef = useRef<CancellableTask | null>(null);

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
                    const endTime = Date.now() + timeToExpire * 1000;
                    refreshTaskRef.current = queueTask(refreshAuthMaterial, endTime);
                }
            } catch (error) {
                logout();
                console.error(error);
            }
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