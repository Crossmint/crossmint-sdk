import type { IApiKeySigner } from "./types";

export class EVMApiKeySigner implements IApiKeySigner {
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
