import type { ApiKeyInternalSignerConfig, Signer } from "./types";

export class EVMApiKeySigner implements Signer {
    type = "api-key" as const;

    constructor(private readonly config: ApiKeyInternalSignerConfig) {}

    locator() {
        return this.config.locator;
    }

    async signMessage() {
        return await Promise.reject(
            new Error(
                "API key signers do not support direct message signing - signatures are handled automatically by the backend"
            )
        );
    }
    async signTransaction() {
        return await Promise.reject(
            new Error(
                "API key signers do not support direct transaction signing - transaction are handled automatically by the backend"
            )
        );
    }
}
