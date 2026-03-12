import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import nacl from "tweetnacl";
import type { Signer, ServerInternalSignerConfig } from "../types";

export class SolanaServerSigner implements Signer<"server"> {
    type = "server" as const;
    private _address: string;
    private _locator: string;
    private keypair: Keypair;

    constructor(config: ServerInternalSignerConfig) {
        this.keypair = Keypair.fromSeed(config.derivedKeyBytes);
        this._address = this.keypair.publicKey.toBase58();
        this._locator = config.locator;
    }

    address() {
        return this._address;
    }

    locator() {
        return this._locator;
    }

    async signMessage(message: string) {
        const messageBytes = base58.decode(message);
        const signatureBytes = nacl.sign.detached(messageBytes, this.keypair.secretKey);
        return { signature: base58.encode(signatureBytes) };
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
