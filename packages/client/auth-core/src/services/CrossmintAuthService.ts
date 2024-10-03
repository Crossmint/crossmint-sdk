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
            "2024-09-26/session/sdk/auth/refresh",
            { method: "POST", body: JSON.stringify({ refresh: refreshToken }) },
            "Error fetching new refresh and access tokans."
        );

        return {
            jwtToken: result.jwt,
            refreshToken: result.refresh,
            user: result.user,
        };
    }

    async getUserFromServer(externalUserId: string) {
        const result = await this.fetchCrossmintAPI(
            `sdk/auth/user/${externalUserId}`,
            { method: "GET" },
            "Error fetching user."
        );

        return result.user;
    }
    async getUserFromClient(jwt: string) {
        const result = await this.fetchCrossmintAPI("sdk/auth/user", { method: "GET" }, "Error fetching user.", jwt);

        return result;
    }
}
