import type { DeviceInternalSignerConfig, DeviceSignResult } from "./types";
import type { Signer } from "./types";
import type { DeviceSignerKeyStorage } from "../utils/device-signers/DeviceSignerKeyStorage";

export class DeviceSigner implements Signer<"device"> {
    private readonly config: DeviceInternalSignerConfig;
    private readonly deviceSignerKeyStorage: DeviceSignerKeyStorage;

    constructor(config: DeviceInternalSignerConfig, deviceSignerKeyStorage: DeviceSignerKeyStorage) {
        this.config = config;
        this.deviceSignerKeyStorage = deviceSignerKeyStorage;
    }

    public type = "device" as const;

    public locator(): string {
        return this.config.locator || "";
    }

    public async signMessage(message: string): Promise<DeviceSignResult> {
        const signature = await this.deviceSignerKeyStorage.signMessage(this.config.address, message);
        return { signature };
    }

    public async signTransaction(transaction: string): Promise<DeviceSignResult> {
        return await this.signMessage(transaction);
    }
}
