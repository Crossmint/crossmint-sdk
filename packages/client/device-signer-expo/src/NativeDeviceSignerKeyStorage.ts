import { requireNativeModule } from "expo-modules-core";

import { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativeModuleType = Record<string, (...args: any[]) => Promise<any>>;
let _nativeModule: NativeModuleType | null = null;

function getNativeModule(): NativeModuleType {
    if (_nativeModule == null) {
        _nativeModule = requireNativeModule("CrossmintDeviceSigner") as NativeModuleType;
    }
    return _nativeModule;
}

export class NativeDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    constructor() {
        // apiKey is not used by the native implementation — API calls go through the SDK context.
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

    /**
     * Deletes a pending key that was never mapped to a wallet address.
     * Call this if wallet creation fails after `generateKey({})`.
     */
    deletePendingKey(publicKeyBase64: string): Promise<void> {
        return getNativeModule().deletePendingKey(publicKeyBase64);
    }
}
