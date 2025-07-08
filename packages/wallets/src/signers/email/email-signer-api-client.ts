import { APIKeyUsageOrigin, type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { SDK_NAME, SDK_VERSION } from "../../utils/constants";
import { InvalidApiKeyError } from "../../utils/errors";
import type { KeyType } from "@crossmint/client-signers";

export class EmailSignerApiClient extends CrossmintApiClient {
    private apiPrefix = "api/v1/signers";

    constructor(crossmint: Crossmint) {
        super(crossmint, {
            internalConfig: {
                sdkMetadata: { name: SDK_NAME, version: SDK_VERSION },
            },
        });
    }

    async pregenerateSigner(email: string, keyType: KeyType) {
        const response = await this.post(`${this.apiPrefix}/derive-public-key`, {
            body: JSON.stringify({ authId: `email:${email}`, keyType }),
            headers: this.headers,
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to fetch public key: ${response.status} ${errorBody}`);
        }
        return await response.json();
    }

    public get isServerSide() {
        return this.parsedAPIKey.usageOrigin === APIKeyUsageOrigin.SERVER;
    }

    public get environment() {
        if (!this.parsedAPIKey.isValid) {
            throw new InvalidApiKeyError("Invalid API key");
        }
        return this.parsedAPIKey.environment;
    }

    private get headers() {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        return headers;
    }
}
