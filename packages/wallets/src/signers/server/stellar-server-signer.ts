import type { SignerAdapter, ServerInternalSignerConfig, ServerSignerLocator } from "../types";
import { ed25519KeypairFromSeed, ed25519Sign, encodeStellarPublicKey } from "../../utils/stellar";

export class StellarServerSigner implements SignerAdapter<"server"> {
    type = "server" as const;
    private _address: string;
    private _locator: ServerSignerLocator;
    private secretKey: Uint8Array;

    constructor(config: ServerInternalSignerConfig) {
        const keypair = ed25519KeypairFromSeed(config.derivedKeyBytes);
        this._address = encodeStellarPublicKey(keypair.publicKey);
        this._locator = config.locator;
        this.secretKey = keypair.secretKey;
    }

    address() {
        return this._address;
    }

    locator() {
        return this._locator;
    }

    async signMessage(message: string) {
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(message)) {
            throw new Error("StellarServerSigner.signMessage: expected a base64-encoded string");
        }
        const messageBytes = Buffer.from(message, "base64");
        const signatureBytes = ed25519Sign(messageBytes, this.secretKey);
        return { signature: Buffer.from(signatureBytes).toString("base64") };
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
