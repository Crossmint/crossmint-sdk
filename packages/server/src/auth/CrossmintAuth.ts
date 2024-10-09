import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { SDK_NAME, SDK_VERSION } from "./utils/constants";

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
}
