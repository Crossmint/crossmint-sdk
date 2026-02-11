import type { Signer, P256KeypairInternalSignerConfig } from "./types";
import { sha256, toHex } from "viem";

export class SolanaP256KeypairSigner implements Signer {
    type = "p256-keypair" as const;
    private _address: string;
    private _locator: string;
    private onSignTransaction: (publicKeyBase64: string, data: Uint8Array) => Promise<Uint8Array>;
    private readonly STUB_ORIGIN = "https://crossmint.com";

    constructor(config: P256KeypairInternalSignerConfig) {
        this._address = config.address;
        this._locator = config.locator;
        this.onSignTransaction = config.onSignTransaction;
    }

    address() {
        return this._address;
    }

    locator() {
        return this._locator;
    }

    async signMessage(message: string): Promise<{ signature: string }> {
        return await this.createWebAuthnSignature(message);
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        return await this.createWebAuthnSignature(transaction);
    }

    async signRawMessage(signatureMessageHex: string): Promise<{ signature: string }> {
        const signatureMessageBytes = new Uint8Array(Buffer.from(signatureMessageHex, "hex"));
        const signatureBytes = await this.onSignTransaction(this.address(), signatureMessageBytes);
        const rHex = Buffer.from(signatureBytes.slice(0, 32)).toString("hex").padStart(64, "0");
        const sHex = Buffer.from(signatureBytes.slice(32, 64)).toString("hex").padStart(64, "0");
        return { signature: rHex + sHex };
    }

    private async createWebAuthnSignature(challenge: string): Promise<{ signature: string }> {
        const challengeHex = challenge.replace("0x", "");
        const challengeBase64 = Buffer.from(challengeHex, "hex").toString("base64");
        const challengeBase64url = challengeBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        const clientDataJSON = JSON.stringify({
            type: "webauthn.get",
            challenge: challengeBase64url,
            origin: this.STUB_ORIGIN,
            crossOrigin: false,
        });

        const originBytes = new TextEncoder().encode(this.STUB_ORIGIN);
        const rpIdHash = sha256(toHex(originBytes));

        const flags = "05";
        const signCount = "00000000";

        const authenticatorData = (rpIdHash + flags + signCount) as `0x${string}`;

        const clientDataJSONBytes = new TextEncoder().encode(clientDataJSON);
        const clientDataHash = sha256(toHex(clientDataJSONBytes));

        const signatureMessage = (authenticatorData + clientDataHash.slice(2)) as `0x${string}`;

        const signatureMessageBytes = new Uint8Array(Buffer.from(signatureMessage.slice(2), "hex"));
        const signatureBytes = await this.onSignTransaction(this.address(), signatureMessageBytes);

        const rHex = Buffer.from(signatureBytes.slice(0, 32)).toString("hex").padStart(64, "0");
        const sHex = Buffer.from(signatureBytes.slice(32, 64)).toString("hex").padStart(64, "0");

        return { signature: rHex + sHex };
    }
}
