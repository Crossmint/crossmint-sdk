import type { Signer, P256KeypairInternalSignerConfig } from "./types";
import { keccak256, sha256, toHex } from "viem";

export class P256KeypairSigner implements Signer {
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
        // IMPORTANT: Use keccak256 for rpIdHash to match backend (line 182 in backend)
        const originBytes = new TextEncoder().encode(STUB_ORIGIN);
        const rpIdHash = keccak256(toHex(originBytes));

        // flags: 0x05 = User Present (0x01) + User Verified (0x04)
        const flags = "05";

        // signCount: 4 bytes, all zeros
        const signCount = "00000000";

        const authenticatorData = (rpIdHash + flags + signCount) as `0x${string}`;

        // 3. Create signature message: authenticatorData + sha256(clientDataJSON)
        // This matches what the backend expects and what WebAuthn spec requires
        const clientDataJSONBytes = new TextEncoder().encode(clientDataJSON);
        const clientDataHash = sha256(toHex(clientDataJSONBytes));

        const signatureMessage = (authenticatorData + clientDataHash.slice(2)) as `0x${string}`;

        // 4. Sign with P256 private key
        // Web Crypto API will internally do: sign(sha256(signatureMessage))
        const signatureMessageBytes = new Uint8Array(Buffer.from(signatureMessage.slice(2), "hex"));
        const signatureBytes = await this.onSignTransaction(this.address(), signatureMessageBytes);

        // 5. Return r + s as hex string
        const rHex = Buffer.from(signatureBytes.slice(0, 32)).toString("hex").padStart(64, "0");
        const sHex = Buffer.from(signatureBytes.slice(32, 64)).toString("hex").padStart(64, "0");

        return { signature: "0x" + rHex + sHex };
    }
}
