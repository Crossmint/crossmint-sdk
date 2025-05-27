import type { Signer } from "./types";

export class EVMApiKeySigner implements Signer {
    type = "api-key" as const;

    constructor(private readonly address: string) {}

    locator() {
        return `evm-fireblocks-custodial:${this.address}`;
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
