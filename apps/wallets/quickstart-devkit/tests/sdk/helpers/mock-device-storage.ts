import { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";
import { P256 } from "ox";

export class MockDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private readonly keys = new Map<string, `0x${string}`>(); // base64PubKey → private key hex
    private readonly addressMap = new Map<string, string>(); // walletAddress → base64PubKey

    constructor(apiKey: string) {
        super(apiKey);
    }

    async generateKey({ address }: { address?: string } = {}): Promise<string> {
        const privateKey = P256.randomPrivateKey();
        const publicKey = P256.getPublicKey({ privateKey });

        const xHex = publicKey.x.toString(16).padStart(64, "0");
        const yHex = publicKey.y.toString(16).padStart(64, "0");
        const base64 = Buffer.from(`04${xHex}${yHex}`, "hex").toString("base64");

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

        const messageHex = message.startsWith("0x")
            ? (message as `0x${string}`)
            : (`0x${Buffer.from(message, "base64").toString("hex")}` as `0x${string}`);

        // Sign raw digest without additional hashing (message is a pre-computed hash)
        const { r, s } = P256.sign({ payload: messageHex, hash: false, privateKey });
        return {
            r: `0x${r.toString(16).padStart(64, "0")}`,
            s: `0x${s.toString(16).padStart(64, "0")}`,
        };
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
