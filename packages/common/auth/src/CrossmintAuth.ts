import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { AUTH_SDK_ROOT_ENDPOINT, SDK_NAME, SDK_VERSION } from "./utils/constants";
import { type AuthMaterialWithUser, CrossmintAuthenticationError, type AuthMaterialResponse } from "./types";

export type CrossmintAuthOptions = {
    refreshRoute?: string;
};

export class CrossmintAuth {
    protected crossmint: Crossmint;
    protected apiClient: CrossmintApiClient;
    protected refreshRoute: string | null;

    constructor(crossmint: Crossmint, apiClient: CrossmintApiClient, options: CrossmintAuthOptions = {}) {
        this.crossmint = crossmint;
        this.apiClient = apiClient;
        this.refreshRoute = options.refreshRoute ?? null;
    }

    public static from(crossmint: Crossmint, options: CrossmintAuthOptions = {}): CrossmintAuth {
        return new CrossmintAuth(crossmint, CrossmintAuth.defaultApiClient(crossmint), options);
    }

    public getJwksUri() {
        return `${this.apiClient.baseUrl}/.well-known/jwks.json`;
    }

    protected async refreshAuthMaterial(refreshToken?: string): Promise<AuthMaterialWithUser> {
        if (this.refreshRoute != null) {
            return await this.refreshFromCustomRoute(refreshToken);
        }

        if (refreshToken != null) {
            return await this.refresh(refreshToken);
        }

        throw new CrossmintAuthenticationError("Refresh token missing from parameters");
    }

    protected async refresh(refreshToken: string): Promise<AuthMaterialWithUser> {
        const result = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/refresh`, {
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

    private async refreshFromCustomRoute(refreshToken?: string): Promise<AuthMaterialWithUser> {
        if (this.refreshRoute == null) {
            throw new Error("Custom refresh route is not set");
        }

        const result = await fetch(this.refreshRoute, {
            method: "POST",
            body: JSON.stringify({ refresh: refreshToken }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const resultJson = await result.json();
        if (!result.ok) {
            throw new CrossmintAuthenticationError(resultJson.message);
        }

        return resultJson;
    }

    protected async logoutFromDefaultRoute(refreshToken: string) {
        return await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/logout`, {
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refresh: refreshToken,
            }),
        });
    }

    static defaultApiClient(crossmint: Crossmint): CrossmintApiClient {
        return new CrossmintApiClient(crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: SDK_VERSION,
                },
            },
        });
    }
}
