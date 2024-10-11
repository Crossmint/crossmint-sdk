import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import {
    CrossmintAuthenticationError,
    type AuthSession,
    type AuthMaterialBasic,
    type AuthMaterial,
    type AuthMaterialResponse,
} from "@crossmint/common-sdk-auth";
import type { GenericRequest } from "./types/request";
import { getAuthCookies } from "./utils/cookies";
import { SDK_NAME, SDK_VERSION } from "./utils/constants";
import { verifyCrossmintJwtToken } from "./utils/jwt";

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

    public getJWKSUri() {
        return `${this.apiClient.baseUrl}/.well-known/jwks.json`;
    }

    public verifyCrossmintJwtToken(token: string) {
        return verifyCrossmintJwtToken(token, this.getJWKSUri());
    }

    private async refreshAuthMaterial(refreshToken: string): Promise<AuthMaterial> {
        const result = await this.apiClient.post("/session/sdk/auth/refresh", {
            body: JSON.stringify({ refresh: refreshToken }),
        });

        const resultJson = (await result.json()) as AuthMaterialResponse;

        return {
            jwtToken: resultJson.jwt,
            refreshToken: resultJson.refresh,
            user: resultJson.user,
        };
    }

    public async getSession(options: GenericRequest | AuthMaterialBasic): Promise<AuthSession> {
        const { jwtToken, refreshToken } = "refreshToken" in options ? options : getAuthCookies(options);

        if (!refreshToken) {
            throw new CrossmintAuthenticationError("Refresh token not found");
        }

        try {
            return await this.validateOrRefreshSession(jwtToken, refreshToken);
        } catch (error) {
            console.error("Failed to get session", error);
            throw new CrossmintAuthenticationError("Failed to get session");
        }
    }

    private async validateOrRefreshSession(jwtToken: string | undefined, refreshToken: string): Promise<AuthSession> {
        if (jwtToken) {
            try {
                const decodedJwt = await this.verifyCrossmintJwtToken(jwtToken);
                return {
                    jwtToken,
                    userId: decodedJwt.sub as string,
                };
            } catch (_) {
                // The JWT is invalid, we need to refresh the session
            }
        }

        const refreshedAuthMaterial = await this.refreshAuthMaterial(refreshToken);
        return {
            jwtToken: refreshedAuthMaterial.jwtToken,
            userId: refreshedAuthMaterial.user.id,
        };
    }
}
