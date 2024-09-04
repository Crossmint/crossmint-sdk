import { APIErrorService, BaseCrossmintService } from "@crossmint/client-sdk-base";

import { authLogger } from "./logger";

export class CrossmintAuthService extends BaseCrossmintService {
    protected apiErrorService = new APIErrorService<never>({});
    protected logger = authLogger;

    public getJWKSUri() {
        return `${this.crossmintBaseUrl}/.well-known/jwks.json`;
    }
}
