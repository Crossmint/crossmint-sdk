import { CrossmintApiClient, CrossmintApiClientCtorWithoutExpectationsParams } from "./CrossmintApiClient";

export class CrossmintClientSideApiClient extends CrossmintApiClient {
    constructor(params: CrossmintApiClientCtorWithoutExpectationsParams) {
        super({
            ...params,
            expectations: {
                usageOrigin: "client",
            },
        });
    }
}

export function createCrossmintClientSideApiClient(params: CrossmintApiClientCtorWithoutExpectationsParams) {
    return new CrossmintClientSideApiClient(params);
}
