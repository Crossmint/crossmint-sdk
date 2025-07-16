import { type Crossmint, CrossmintApiClient, type CrossmintApiClientInternalConfig } from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";

export function createCrossmintApiClient(
    crossmint: Crossmint,
    apiKeyExpectations?: CrossmintApiClientInternalConfig["apiKeyExpectations"]
) {
    return new CrossmintApiClient(crossmint, {
        internalConfig: {
            sdkMetadata: {
                name: "@crossmint/client-sdk-react-native-ui",
                version: packageJson.version,
            },
            apiKeyExpectations,
        },
    });
}
