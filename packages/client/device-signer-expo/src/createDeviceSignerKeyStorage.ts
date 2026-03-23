import { NativeModules } from "react-native";
import type { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

type ExpoGlobal = typeof globalThis & {
    expo?: {
        modules?: Record<string, unknown>;
    };
    NativeModulesProxy?: Record<string, unknown>;
};

/**
 * Creates the appropriate DeviceSignerKeyStorage implementation for the current environment.
 *
 * - In development builds (with native modules available): Uses `NativeDeviceSignerKeyStorage`
 *   backed by Secure Enclave (iOS) or Android Keystore (Android) for hardware-backed security.
 * - In Expo Go (without native modules): Falls back to `SoftwareDeviceSignerKeyStorage`
 *   backed by `@noble/curves` P-256 + `expo-secure-store` for software-based key management.
 *
 * @returns A DeviceSignerKeyStorage instance suitable for the current environment.
 */
export function createDeviceSignerKeyStorage(): DeviceSignerKeyStorage {
    if (isNativeModuleAvailable()) {
        const { NativeDeviceSignerKeyStorage } = require("./NativeDeviceSignerKeyStorage");
        return new NativeDeviceSignerKeyStorage();
    }

    const { SoftwareDeviceSignerKeyStorage } = require("./SoftwareDeviceSignerKeyStorage");
    return new SoftwareDeviceSignerKeyStorage();
}

/**
 * Checks whether the CrossmintDeviceSigner native module is available.
 * Returns `false` in Expo Go or any environment where the native module is not installed.
 */
export function isNativeModuleAvailable(): boolean {
    const moduleName = "CrossmintDeviceSigner";
    const expoGlobal = globalThis as ExpoGlobal;
    const nativeModules = NativeModules as Record<string, unknown> & {
        NativeUnimoduleProxy?: {
            modulesConstants?: Record<string, unknown>;
        };
    };

    return (
        expoGlobal.expo?.modules?.[moduleName] != null ||
        expoGlobal.NativeModulesProxy?.[moduleName] != null ||
        nativeModules[moduleName] != null ||
        nativeModules.NativeUnimoduleProxy?.modulesConstants?.[moduleName] != null
    );
}
