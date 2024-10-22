import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import {
    CrossmintAuthenticationError,
    type AuthMaterialBasic,
    type AuthMaterialWithUser,
    type AuthMaterialResponse,
    type AuthSession,
    type AuthMaterial,
} from "@crossmint/common-sdk-auth";
import type { GenericRequest, GenericResponse } from "./types/request";
import { getAuthCookies, setAuthCookies } from "./utils/cookies";
import { verifyCrossmintJwt } from "./utils/jwt";
import { CROSSMINT_API_VERSION, SDK_NAME, SDK_VERSION } from "./utils/constants";

export class CrossmintAuth {
    private crossmint: Crossmint;
    private apiClient: CrossmintApiClient;

    private constructor(crossmint: Crossmint) {
        this.crossmint = crossmint;
        this.apiClient = new CrossmintApiClient(this.crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: SDK_VERSION,
                },
            },
        });
    }

    public static from(crossmint: Crossmint): CrossmintAuth {
        return new CrossmintAuth(crossmint);
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

    public getJwksUri() {
        return `${this.apiClient.baseUrl}/.well-known/jwks.json`;
    }

    public storeAuthMaterial(response: GenericResponse, authMaterial: AuthMaterial) {
        setAuthCookies(response, authMaterial);
    }

    private async refreshAuthMaterial(refreshToken: string): Promise<AuthMaterialWithUser> {
        const result = await this.apiClient.post(`api/${CROSSMINT_API_VERSION}/session/sdk/auth/refresh`, {
            body: JSON.stringify({ refresh: refreshToken }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!result.ok) {
            throw new CrossmintAuthenticationError(result.statusText);
        }

        const resultJson = (await result.json()) as AuthMaterialResponse;

        return {
            jwt: resultJson.jwt,
            refreshToken: resultJson.refresh,
            user: resultJson.user,
        };
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
