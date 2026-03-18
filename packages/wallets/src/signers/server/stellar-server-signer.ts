import { Keypair } from "@stellar/stellar-sdk";
import type { Signer, ServerInternalSignerConfig, SignerLocator } from "../types";

export class StellarServerSigner implements Signer<"server"> {
    type = "server" as const;
    private _address: string;
    private _locator: string;
    private keypair: Keypair;

    constructor(config: ServerInternalSignerConfig) {
        this.keypair = Keypair.fromRawEd25519Seed(Buffer.from(config.derivedKeyBytes));
        this._address = this.keypair.publicKey();
        this._locator = config.locator;
    }

    address() {
        return this._address;
    }

    locator() {
        return this._locator as SignerLocator;
    }

    async signMessage(message: string) {
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(message)) {
            throw new Error("StellarServerSigner.signMessage: expected a base64-encoded string");
        }
        const messageBytes = Buffer.from(message, "base64");
        const signatureBytes = this.keypair.sign(messageBytes);
        return { signature: signatureBytes.toString("base64") };
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
