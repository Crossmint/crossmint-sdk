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
import { verifyCrossmintJwtToken } from "./utils/jwt";
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

    public async getSession(options: GenericRequest | AuthMaterialBasic): Promise<AuthSession> {
        const { jwt, refreshToken } = "refreshToken" in options ? options : getAuthCookies(options);

        if (!refreshToken) {
            throw new CrossmintAuthenticationError("Refresh token not found");
        }

        try {
            return await this.validateOrRefreshSession(jwt, refreshToken);
        } catch (error) {
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

    public verifyCrossmintJwtToken(token: string) {
        return verifyCrossmintJwtToken(token, this.getJwksUri());
    }

    public getJwksUri() {
        return `${this.apiClient.baseUrl}/.well-known/jwks.json`;
    }

    private async refreshAuthMaterial(refreshToken: string): Promise<AuthMaterial> {
        const result = await this.apiClient.post(`api/${CROSSMINT_API_VERSION}/session/sdk/auth/refresh`, {
            body: JSON.stringify({ refresh: refreshToken }),
        });

        const resultJson = (await result.json()) as AuthMaterialResponse;

        return {
            jwt: resultJson.jwt,
            refreshToken: resultJson.refresh,
            user: resultJson.user,
        };
    }

    private async validateOrRefreshSession(jwt: string | undefined, refreshToken: string): Promise<AuthSession> {
        if (jwt) {
            try {
                const decodedJwt = await this.verifyCrossmintJwtToken(jwt);
                return {
                    jwt,
                    userId: decodedJwt.sub as string,
                };
            } catch (_) {
                // The JWT is invalid, we need to refresh the session
            }
        }

        const refreshedAuthMaterial = await this.refreshAuthMaterial(refreshToken);
        return {
            jwt: refreshedAuthMaterial.jwt,
            userId: refreshedAuthMaterial.user.id,
        };
    }
}
