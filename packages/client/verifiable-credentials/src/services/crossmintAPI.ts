import { APIKeyUsageOrigin, validateAPIKey } from "@crossmint/common-sdk-base";

export function getUsageOrigin() {
    if (typeof window !== "undefined") {
        return APIKeyUsageOrigin.CLIENT;
    } else if (typeof global !== "undefined") {
        return APIKeyUsageOrigin.SERVER;
    } else {
        console.error("Unknown environment, cannot determine API key usage origin, be careful!");
        return null;
    }
}

export class CrossmintAPI {
    private static apiKey: string;
    public static ipfsGateways: string[];

    public static init(
        apiKey: string,
        ipfsGateways: string[] = [
            "https://fleek.ipfs.io/ipfs/{cid}",
            "https://ipfs.io/ipfs/{cid}",
            "https://gateway.ipfs.io/ipfs/{cid}",
            "https://nftstorage.link/ipfs/{cid}",
        ]
    ) {
        const usageOrigin = getUsageOrigin();

        if (usageOrigin != null) {
            const validationResult = validateAPIKey(apiKey, {
                usageOrigin: usageOrigin,
            });
            if (!validationResult.isValid) {
                throw new Error(`API key invalid: ${validationResult.message}`);
            }
        }

        this.apiKey = apiKey;
        this.ipfsGateways = ipfsGateways;
    }

    public static getHeaders() {
        if (!this.apiKey) {
            throw new Error("Credentials not set");
        }

        return {
            "x-api-key": this.apiKey,
            accept: "application/json",
        };
    }
}
