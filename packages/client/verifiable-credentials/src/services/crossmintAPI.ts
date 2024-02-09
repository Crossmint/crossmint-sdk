import { APIKeyUsageOrigin, validateAPIKey } from "@crossmint/common-sdk-base";

export class CrossmintAPI {
    private static apiKey: string;
    public static ipfsGateways: string[];

    public static init(
        apiKey: string,
        ipfsGateways: string[] = [
            "https://fleek.ipfs.io/ipfs/{cid}",
            "https://ipfs.io/ipfs/{cid}",
            "https://gateway.ipfs.io/ipfs/{cid}",
            "https://{cid}.ipfs.nftstorage.link",
        ]
    ) {
        const validationResult = validateAPIKey(apiKey, {
            usageOrigin: APIKeyUsageOrigin.CLIENT,
        });
        if (!validationResult.isValid) {
            throw new Error(`API key invalid: ${validationResult.message}`);
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
