export abstract class DeviceSignerKeyStorage {
    constructor(private readonly apiKey: string) {}
    abstract generateKey(address?: string): Promise<string>;
    abstract mapAddressToKey(address: string, publicKeyBase64: string): Promise<void>;
    abstract getKey(address: string): Promise<string | null>;
    abstract signMessage(address: string, message: string): Promise<{ r: string; s: string }>;
    abstract deleteKey(address: string): Promise<void>;
}
