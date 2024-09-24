import { APIErrorService, BaseCrossmintService } from "@crossmint/client-sdk-base";

import { authLogger } from "./logger";

export class CrossmintAuthService extends BaseCrossmintService {
    protected apiErrorService = new APIErrorService<never>({});
    protected logger = authLogger;

    public getJWKSUri() {
        return `${this.crossmintBaseUrl}/.well-known/jwks.json`;
    }

    async refreshAuthMaterial(refreshToken: string) {
        const result = await this.fetchCrossmintAPI(
            "session/sdk/auth/refresh",
            { method: "POST", body: JSON.stringify({ refresh: refreshToken }) },
            "Error fetching new refresh and access tokans."
        );

        return {
            jwtToken: result.jwt,
            refreshToken: result.refresh,
        };
    }
}
