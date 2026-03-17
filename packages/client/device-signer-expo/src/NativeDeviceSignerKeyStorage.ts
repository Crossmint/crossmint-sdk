import { requireNativeModule } from "expo-modules-core";

import { DeviceSignerKeyStorage, type BiometricPolicy } from "@crossmint/wallets-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativeModuleType = Record<string, (...args: any[]) => Promise<any>>;
let _nativeModule: NativeModuleType | null = null;

function getNativeModule(): NativeModuleType {
    if (_nativeModule == null) {
        _nativeModule = requireNativeModule("CrossmintDeviceSigner") as NativeModuleType;
    }
    return _nativeModule;
}

export type { BiometricPolicy };

/**
 * React Native implementation of {@link DeviceSignerKeyStorage} backed by the platform's
 * secure hardware: Secure Enclave on iOS, Android Keystore on Android.
 *
 * Pass an instance to the `deviceSignerKeyStorage` prop of `CrossmintWalletProvider`.
 *
 * @example
 * ```tsx
 * import { NativeDeviceSignerKeyStorage } from "@crossmint/expo-device-signer";
 *
 * <CrossmintWalletProvider
 *     deviceSignerKeyStorage={new NativeDeviceSignerKeyStorage()}
 * >
 *     {children}
 * </CrossmintWalletProvider>
 * ```
 */
export class NativeDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    private readonly defaultBiometricPolicy: BiometricPolicy;

    constructor(options?: { biometricPolicy?: BiometricPolicy }) {
        // apiKey is not used by the native implementation — API calls go through the SDK context.
        super("");
        this.defaultBiometricPolicy = options?.biometricPolicy ?? "none";
    }

    generateKey(params: { address?: string; biometricPolicy?: Exclude<BiometricPolicy, "session"> }): Promise<string>;
    generateKey(params: {
        address?: string;
        biometricPolicy: "session";
        biometricExpirationTime: number;
    }): Promise<string>;
    generateKey(params: {
        address?: string;
        biometricPolicy?: BiometricPolicy;
        biometricExpirationTime?: number;
    }): Promise<string> {
        // "session" is not supported natively — fall back to "always".
        const policy =
            params.biometricPolicy === "session" ? "always" : params.biometricPolicy ?? this.defaultBiometricPolicy;
        return getNativeModule().generateKey(params.address ?? null, policy);
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
