import { LIB_VERSION } from "@/consts/version";
import { type Crossmint, CrossmintApiClient, type CrossmintApiClientInternalConfig } from "@crossmint/common-sdk-base";

export function createCrossmintApiClient(
    crossmint: Crossmint,
    apiKeyExpectations?: CrossmintApiClientInternalConfig["apiKeyExpectations"]
) {
    return new CrossmintApiClient(crossmint, {
        internalConfig: {
            sdkMetadata: {
                name: "@crossmint/client-sdk-react-ui",
                version: LIB_VERSION,
            },
            apiKeyExpectations,
        },
    });
}
