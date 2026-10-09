import { P256 } from "ox";
import { DeviceSignerKeyStorage } from "../utils/device-signers/DeviceSignerKeyStorage";

export type SandboxDeviceSignerFailure = "key-absent" | "key-unusable" | "storage-unreadable";

export class SandboxDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private readonly keys = new Map<string, `0x${string}`>();
    private readonly addressMap = new Map<string, string>();
    private failure?: SandboxDeviceSignerFailure;

    constructor(apiKey: string, failure?: SandboxDeviceSignerFailure) {
        super(apiKey);
        this.failure = failure;
    }

    setFailure(failure: SandboxDeviceSignerFailure | undefined): void {
        this.failure = failure;
    }

    private assertStorageReadable(): void {
        if (this.failure === "storage-unreadable") {
            throw new Error("Device signer storage is unavailable");
        }
    }

    async generateKey({ address }: { address?: string } = {}): Promise<string> {
        this.assertStorageReadable();
        const privateKey = P256.randomPrivateKey();
        const publicKey = P256.getPublicKey({ privateKey });

        const xHex = publicKey.x.toString(16).padStart(64, "0");
        const yHex = publicKey.y.toString(16).padStart(64, "0");
        const base64 = Buffer.from(`04${xHex}${yHex}`, "hex").toString("base64");

        this.keys.set(base64, privateKey);
        if (address) {
            this.addressMap.set(address, base64);
        }

        return base64;
    }

    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        this.assertStorageReadable();
        this.addressMap.set(address, publicKeyBase64);
    }

    async getKey(address: string): Promise<string | null> {
        this.assertStorageReadable();
        if (this.failure === "key-absent") {
            return null;
        }
        return this.addressMap.get(address) ?? null;
    }

    async hasKey(publicKeyBase64: string): Promise<boolean> {
        this.assertStorageReadable();
        if (this.failure === "key-absent") {
            return false;
        }
        return this.keys.has(publicKeyBase64);
    }

    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        this.assertStorageReadable();
        if (this.failure === "key-absent") {
            throw new Error(`No key mapped for address: ${address}`);
        }
        if (this.failure === "key-unusable") {
            throw new Error("SIGNING_FAILED: the device key cannot produce a signature");
        }

        const base64 = this.addressMap.get(address);
        if (!base64) {
            throw new Error(`No key mapped for address: ${address}`);
        }
        const privateKey = this.keys.get(base64);
        if (!privateKey) {
            throw new Error(`No private key for pubkey: ${base64}`);
        }

        const messageHex = message.startsWith("0x")
            ? (message as `0x${string}`)
            : (`0x${Buffer.from(message, "base64").toString("hex")}` as `0x${string}`);

        const { r, s } = P256.sign({ payload: messageHex, hash: false, privateKey });
        return {
            r: `0x${r.toString(16).padStart(64, "0")}`,
            s: `0x${s.toString(16).padStart(64, "0")}`,
        };
    }

    async deleteKey(address: string): Promise<void> {
        this.assertStorageReadable();
        const base64 = this.addressMap.get(address);
        this.addressMap.delete(address);
        const stillReferenced = base64 != null && [...this.addressMap.values()].includes(base64);
        if (base64 != null && !stillReferenced) {
            this.keys.delete(base64);
        }
    }

    getDeviceName(): string {
        return "Sandbox Test Device";
    }
}
