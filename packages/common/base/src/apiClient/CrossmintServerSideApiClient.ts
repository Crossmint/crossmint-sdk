import { CrossmintApiClient, CrossmintApiClientCtorWithoutExpectationsParams } from "./CrossmintApiClient";

export class CrossmintServerSideApiClient extends CrossmintApiClient {
    constructor(params: CrossmintApiClientCtorWithoutExpectationsParams) {
        super({
            ...params,
            expectations: {
                usageOrigin: "server",
            },
        });
    }
}

export function createCrossmintServerSideApiClient(params: CrossmintApiClientCtorWithoutExpectationsParams) {
    return new CrossmintServerSideApiClient(params);
}
