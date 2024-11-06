import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { CROSSMINT_API_VERSION, SDK_NAME, SDK_VERSION } from "./utils/constants";
import { type AuthMaterialWithUser, CrossmintAuthenticationError, type AuthMaterialResponse } from "./types";

export class CrossmintAuth {
    protected crossmint: Crossmint;
    protected apiClient: CrossmintApiClient;

    constructor(crossmint: Crossmint, apiClient: CrossmintApiClient) {
        this.crossmint = crossmint;
        this.apiClient = apiClient;
    }

    public static from(crossmint: Crossmint): CrossmintAuth {
        return new CrossmintAuth(crossmint, CrossmintAuth.defaultApiClient(crossmint));
    }

    public getJwksUri() {
        return `${this.apiClient.baseUrl}/.well-known/jwks.json`;
    }

    protected async refreshAuthMaterial(refreshToken: string): Promise<AuthMaterialWithUser> {
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
