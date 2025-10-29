import type { Signer, EVM256KeypairInternalSignerConfig } from "./types";
import { concat, toHex, sha256 } from "viem";

export class EVM256KeypairSigner implements Signer {
    type = "evm-p256-keypair" as const;
    private publicKey: string;
    private chain: string;
    private _locator: string;
    private onSignTransaction: (publicKeyBase64: string, data: Uint8Array) => Promise<Uint8Array>;
    private readonly STUB_ORIGIN = "https://crossmint.com";

    constructor(config: EVM256KeypairInternalSignerConfig) {
        this.chain = config.chain;
        this.publicKey = config.publicKey;
        this._locator = config.locator;
        this.onSignTransaction = config.onSignTransaction;
    }

    address() {
        return this.publicKey;
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

    private async createWebAuthnSignature(challenge: string): Promise<{ signature: string }> {
        const STUB_ORIGIN = "https://crossmint.com";

        // 1. Create clientDataJSON with base64url encoded challenge
        const challengeHex = challenge.replace("0x", "");
        const challengeBase64 = Buffer.from(challengeHex, "hex").toString("base64");
        const challengeBase64url = challengeBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        const clientDataJSON = JSON.stringify({
            type: "webauthn.get",
            challenge: challengeBase64url,
            origin: STUB_ORIGIN,
            crossOrigin: false,
        });

        // 2. Create authenticatorData
        const rpIdHashHex = sha256(toHex(new TextEncoder().encode(STUB_ORIGIN)));
        const flags = toHex(new Uint8Array([0x05]));
        const signCount = toHex(new Uint8Array([0x00, 0x00, 0x00, 0x00]));
        const authenticatorData = concat([rpIdHashHex, flags, signCount]);

        // 3. Create signature message
        const clientDataHash = sha256(toHex(new TextEncoder().encode(clientDataJSON)));
        const signatureMessage = concat([authenticatorData, clientDataHash]);

        // 4. Sign with P256 private key
        const signatureMessageBytes = new Uint8Array(Buffer.from(signatureMessage.slice(2), "hex"));
        const signatureBytes = await this.onSignTransaction(this.publicKey, signatureMessageBytes);

        // 5. Return r + s as hex string (backend will encode to WebAuthn)
        const rHex = Buffer.from(signatureBytes.slice(0, 32)).toString("hex").padStart(64, "0");
        const sHex = Buffer.from(signatureBytes.slice(32, 64)).toString("hex").padStart(64, "0");

        return { signature: "0x" + rHex + sHex };
    }
}
