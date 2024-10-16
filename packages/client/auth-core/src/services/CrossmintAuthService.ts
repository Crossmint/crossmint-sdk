import { APIErrorService, BaseCrossmintService } from "@crossmint/client-sdk-base";

import { authLogger } from "./logger";
import { CROSSMINT_API_VERSION } from "../utils/constants";
export class CrossmintAuthService extends BaseCrossmintService {
    protected apiErrorService = new APIErrorService<never>({});
    protected logger = authLogger;

    public getJWKSUri() {
        return `${this.crossmintBaseUrl}/.well-known/jwks.json`;
    }

    async refreshAuthMaterial(refreshToken: string) {
        const result = await this.fetchCrossmintAPI(
            `${CROSSMINT_API_VERSION}/session/sdk/auth/refresh`,
            { method: "POST", body: JSON.stringify({ refresh: refreshToken }) },
            "Error fetching new refresh and access tokans."
        );

        return {
            jwt: result.jwt,
            refreshToken: result.refresh,
            user: result.user,
        };
    }

    async getUserFromClient(jwt: string) {
        return await this.fetchCrossmintAPI(
            `${CROSSMINT_API_VERSION}/sdk/auth/user`,
            { method: "GET" },
            "Error fetching user.",
            jwt
        );
    }
}
