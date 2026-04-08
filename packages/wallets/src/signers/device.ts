import type { DeviceInternalSignerConfig, DeviceSignResult, DeviceSignerLocator } from "./types";
import type { SignerAdapter } from "./types";
import type { DeviceSignerKeyStorage } from "../utils/device-signers/DeviceSignerKeyStorage";
export class DeviceSigner implements SignerAdapter<"device"> {
    private readonly config: DeviceInternalSignerConfig;
    private readonly deviceSignerKeyStorage: DeviceSignerKeyStorage;

    constructor(config: DeviceInternalSignerConfig, deviceSignerKeyStorage: DeviceSignerKeyStorage) {
        this.config = config;
        this.deviceSignerKeyStorage = deviceSignerKeyStorage;
    }

    public type = "device" as const;

    public locator(): DeviceSignerLocator {
        return this.config.locator || ("device:" as DeviceSignerLocator);
    }

    public async signMessage(message: string): Promise<DeviceSignResult> {
        const signature = await this.deviceSignerKeyStorage.signMessage(this.config.address, message);
        return { signature };
    }

    public async signTransaction(transaction: string): Promise<DeviceSignResult> {
        return await this.signMessage(transaction);
    }
}
