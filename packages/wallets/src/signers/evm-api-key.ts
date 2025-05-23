import type { Signer } from "./types";

export class EVMApiKeySigner implements Signer {
    type = "api-key" as const;

    constructor(private readonly address: string) {}

    locator() {
        return `evm-fireblocks-custodial:${this.address}`;
    }

    // TODO: figure out if we need this..
    async sign(message: string): Promise<string> {
        return "";
    }
}
