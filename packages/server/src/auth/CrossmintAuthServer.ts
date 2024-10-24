import {
    CrossmintAuth,
    CrossmintAuthenticationError,
    type AuthMaterialBasic,
    type AuthSession,
    type AuthMaterial,
    CROSSMINT_API_VERSION,
} from "@crossmint/common-sdk-auth";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { GenericRequest, GenericResponse } from "./types/request";
import { getAuthCookies, setAuthCookies } from "./utils/cookies";
import { verifyCrossmintJwt } from "./utils/jwt";

export class CrossmintAuthServer extends CrossmintAuth {
    private constructor(crossmint: Crossmint) {
        super(crossmint);
    }

    public static from(crossmint: Crossmint): CrossmintAuthServer {
        return new CrossmintAuthServer(crossmint);
    }

    public async getSession(
        options: GenericRequest | AuthMaterialBasic,
        response?: GenericResponse
    ): Promise<AuthSession> {
        const { jwt, refreshToken } = "refreshToken" in options ? options : getAuthCookies(options);

        if (!refreshToken) {
            throw new CrossmintAuthenticationError("Refresh token not found");
        }

        try {
            return await this.validateOrRefreshSession(jwt, refreshToken, response);
        } catch (error) {
            if (error instanceof CrossmintAuthenticationError && response != null) {
                this.storeAuthMaterial(response, {
                    jwt: "",
                    refreshToken: {
                        secret: "",
                        expiresAt: "",
                    },
                });
            }
            console.error("Failed to get session", error);
            throw new CrossmintAuthenticationError("Failed to get session");
        }
    }

    async getUser(externalUserId: string) {
        const result = await this.apiClient.get(`api/${CROSSMINT_API_VERSION}/sdk/auth/user/${externalUserId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const user = await result.json();
        return user;
    }

    public verifyCrossmintJwt(token: string) {
        return verifyCrossmintJwt(token, this.getJwksUri());
    }

    public storeAuthMaterial(response: GenericResponse, authMaterial: AuthMaterial) {
        setAuthCookies(response, authMaterial);
    }

    private async validateOrRefreshSession(
        jwt: string | undefined,
        refreshToken: string,
        response?: GenericResponse
    ): Promise<AuthSession> {
        if (jwt) {
            try {
                const decodedJwt = await this.verifyCrossmintJwt(jwt);
                return {
                    jwt,
                    refreshToken: {
                        secret: refreshToken,
                        expiresAt: "",
                    },
                    userId: decodedJwt.sub as string,
                };
            } catch (_) {
                // The JWT is invalid, we need to refresh the session
            }
        }

        const refreshedAuthMaterial = await this.refreshAuthMaterial(refreshToken);

        if (response != null) {
            this.storeAuthMaterial(response, refreshedAuthMaterial);
        }

        return {
            jwt: refreshedAuthMaterial.jwt,
            refreshToken: refreshedAuthMaterial.refreshToken,
            userId: refreshedAuthMaterial.user.id,
        };
    }
}
