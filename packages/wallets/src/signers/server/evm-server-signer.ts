import { privateKeyToAccount } from "viem/accounts";
import { bytesToHex } from "@noble/hashes/utils";
import type { Signer, ServerInternalSignerConfig } from "../types";

export class EVMServerSigner implements Signer<"server"> {
    type = "server" as const;
    private _address: string;
    private _locator: string;
    private account: ReturnType<typeof privateKeyToAccount>;

    constructor(config: ServerInternalSignerConfig) {
        this.account = privateKeyToAccount(`0x${bytesToHex(config.derivedKeyBytes)}`);
        this._address = this.account.address;
        this._locator = config.locator;
    }

    address() {
        return this._address;
    }

    locator() {
        return this._locator;
    }

    async signMessage(message: string) {
        const signature = await this.account.signMessage({
            message: {
                raw: message as `0x${string}`,
            },
        });
        return { signature };
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
