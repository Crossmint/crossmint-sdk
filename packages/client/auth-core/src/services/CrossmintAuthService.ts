import { APIErrorService, BaseCrossmintService } from "@crossmint/client-sdk-base";

import { authLogger } from "./logger";

export class CrossmintAuthService extends BaseCrossmintService {
    protected apiErrorService = new APIErrorService<never>({});
    protected logger = authLogger;

    constructor(public apiKey: string, public jwtToken: string) {
        super(apiKey);
    }

    public getJWKSUri() {
        return `${this.crossmintBaseUrl}/.well-known/jwks.json`;
    }
}
