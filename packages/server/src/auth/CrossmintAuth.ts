import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { SDK_NAME, SDK_VERSION } from "./utils/constants";

const CROSSMINT_API_VERSION = "2024-09-26";

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

    async getUser(externalUserId: string) {
        const result = await this.apiClient.get(`api/${CROSSMINT_API_VERSION}/sdk/auth/user/${externalUserId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const user = await result.json();
        return user;
    }
}
