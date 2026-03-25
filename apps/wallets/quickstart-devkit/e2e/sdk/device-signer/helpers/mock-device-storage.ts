import { createPrivateKey, sign as nodeSign, webcrypto } from "node:crypto";
import { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

const crypto = webcrypto as unknown as Crypto;

function parseDERSig(der: Uint8Array): { r: Uint8Array; s: Uint8Array } {
    let pos = 0;
    if (der[pos++] !== 0x30) throw new Error("DER: expected SEQUENCE");
    let totalLen = der[pos++]!;
    if (totalLen & 0x80) {
        const nBytes = totalLen & 0x7f;
        totalLen = 0;
        for (let i = 0; i < nBytes; i++) totalLen = (totalLen << 8) | der[pos++]!;
    }
    if (der[pos++] !== 0x02) throw new Error("DER: expected INTEGER (r)");
    const rLen = der[pos++]!;
    let r = der.slice(pos, pos + rLen);
    pos += rLen;
    if (der[pos++] !== 0x02) throw new Error("DER: expected INTEGER (s)");
    const sLen = der[pos++]!;
    let s = der.slice(pos, pos + sLen);
    while (r.length > 1 && r[0] === 0) r = r.slice(1);
    while (s.length > 1 && s[0] === 0) s = s.slice(1);
    return { r, s };
}

function uint8ToHex32(b: Uint8Array): string {
    return "0x" + Array.from(b).map((n) => n.toString(16).padStart(2, "0")).join("").padStart(64, "0");
}

export class MockDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private readonly keys = new Map<string, CryptoKey>(); // base64PubKey → private CryptoKey
    private readonly addressMap = new Map<string, string>(); // walletAddress → base64PubKey

    constructor(apiKey: string) {
        super(apiKey);
    }

    async generateKey({ address }: { address?: string } = {}): Promise<string> {
        const { publicKey, privateKey } = await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["sign", "verify"]
        );

        const rawBuf = await crypto.subtle.exportKey("raw", publicKey);
        const base64 = Buffer.from(new Uint8Array(rawBuf)).toString("base64");

        this.keys.set(base64, privateKey);
        if (address) this.addressMap.set(address, base64);

        return base64;
    }

    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        this.addressMap.set(address, publicKeyBase64);
    }

    async getKey(address: string): Promise<string | null> {
        return this.addressMap.get(address) ?? null;
    }

    async hasKey(publicKeyBase64: string): Promise<boolean> {
        return this.keys.has(publicKeyBase64);
    }

    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        const base64 = this.addressMap.get(address);
        if (!base64) throw new Error(`No key mapped for address: ${address}`);

        const privateKey = this.keys.get(base64);
        if (!privateKey) throw new Error(`No private key for pubkey: ${base64}`);

        const pkcs8Buf = await crypto.subtle.exportKey("pkcs8", privateKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nodeKey = createPrivateKey({ key: Buffer.from(pkcs8Buf) as any, format: "der", type: "pkcs8" });

        const msgBuf = message.startsWith("0x")
            ? Buffer.from(message.slice(2), "hex")
            : Buffer.from(message, "base64");

        // Sign raw digest without additional hashing (message is a pre-computed hash)
        const derBuf = nodeSign(null, new Uint8Array(msgBuf), nodeKey);
        const { r, s } = parseDERSig(new Uint8Array(derBuf));
        return { r: uint8ToHex32(r), s: uint8ToHex32(s) };
    }

    async deleteKey(address: string): Promise<void> {
        const base64 = this.addressMap.get(address);
        if (base64) this.keys.delete(base64);
        this.addressMap.delete(address);
    }

    getDeviceName(): string {
        return "E2E Test Device";
    }
}
