import { requireNativeModule } from "expo-modules-core";
import * as Device from "expo-device";
import { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nativeModule: any = null;

function getNativeModule() {
    if (_nativeModule == null) {
        _nativeModule = requireNativeModule("CrossmintDeviceSigner");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return _nativeModule;
}

export class NativeDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    constructor() {
        super("");
    }

    generateKey(params: { address?: string }): Promise<string> {
        return getNativeModule().generateKey(params.address ?? null);
    }

    mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        return getNativeModule().mapAddressToKey(address, publicKeyBase64);
    }

    getKey(address: string): Promise<string | null> {
        return getNativeModule().getKey(address);
    }

    hasKey(publicKeyBase64: string): Promise<boolean> {
        return getNativeModule().hasKey(publicKeyBase64);
    }

    signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        return getNativeModule().signMessage(address, message);
    }

    deleteKey(address: string): Promise<void> {
        return getNativeModule().deleteKey(address);
    }

    deletePendingKey(publicKeyBase64: string): Promise<void> {
        return getNativeModule().deletePendingKey(publicKeyBase64);
    }

    getDeviceName(): string {
        const model = Device.deviceName ?? Device.modelName ?? Device.brand;
        const os = Device.osName;
        if (model != null && os != null) {
            return `${model} (${os})`;
        }
        return model ?? os ?? "Unknown Device";
    }
}
