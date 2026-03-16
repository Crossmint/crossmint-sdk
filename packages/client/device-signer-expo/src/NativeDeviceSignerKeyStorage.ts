import { requireNativeModule } from "expo-modules-core";

import type { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativeModuleType = Record<string, (...args: any[]) => Promise<any>>;
let _nativeModule: NativeModuleType | null = null;

function getNativeModule(): NativeModuleType {
    if (_nativeModule == null) {
        _nativeModule = requireNativeModule("CrossmintDeviceSigner") as NativeModuleType;
    }
    return _nativeModule;
}

export type BiometricPolicy = "always" | "none";

/**
 * React Native implementation of DeviceSignerKeyStorage backed by the platform's
 * secure hardware: Secure Enclave on iOS, Android Keystore on Android.
 *
 * Pass an instance of this class to `WalletOptions.deviceSigner` when calling
 * `getOrCreateWallet` from a React Native / Expo app.
 *
 * @example
 * ```typescript
 * import { NativeDeviceSignerKeyStorage } from "@crossmint/expo-device-signer";
 *
 * const wallet = await sdk.wallets.getOrCreateWallet({
 *     chain: "base-sepolia",
 *     signer: emailSigner,
 *     options: {
 *         deviceSigner: new NativeDeviceSignerKeyStorage({ biometricPolicy: "always" }),
 *     },
 * });
 * ```
 */
export class NativeDeviceSignerKeyStorage implements DeviceSignerKeyStorage {
    private readonly biometricPolicy: BiometricPolicy;

    constructor(options?: { biometricPolicy?: BiometricPolicy }) {
        this.biometricPolicy = options?.biometricPolicy ?? "none";
    }

    /**
     * Returns true if a key storage backend is available. Always returns true because
     * the module transparently falls back to software storage on simulators.
     */
    isAvailable(): Promise<boolean> {
        return getNativeModule().isAvailable();
    }

    /**
     * Generates a new P-256 signing key and persists it in hardware.
     *
     * @param address - Wallet address to associate the key with. Pass `null` before
     *   wallet creation; call `mapAddressToKey` once the address is known.
     * @returns Base64-encoded 64-byte raw public key (x‖y).
     */
    generateKey(address: string | null): Promise<string> {
        return getNativeModule().generateKey(address, this.biometricPolicy);
    }

    /**
     * Associates a pending key (generated without an address) with a wallet address.
     * Call this immediately after wallet creation.
     */
    mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        return getNativeModule().mapAddressToKey(address, publicKeyBase64);
    }

    /**
     * Returns the base64-encoded public key stored for the given wallet address,
     * or `null` if no key exists on this device.
     */
    getKey(address: string): Promise<string | null> {
        return getNativeModule().getKey(address);
    }

    /**
     * Signs a base64-encoded message with the key for the given wallet address.
     *
     * @returns ECDSA signature components as hex strings prefixed with `"0x"`.
     */
    signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        return getNativeModule().signMessage(address, message);
    }

    /**
     * Deletes the key for the given wallet address.
     */
    deleteKey(address: string): Promise<void> {
        return getNativeModule().deleteKey(address);
    }

    /**
     * Deletes a pending key that was never mapped to a wallet address.
     * Call this if wallet creation fails after `generateKey(null)`.
     */
    deletePendingKey(publicKeyBase64: string): Promise<void> {
        return getNativeModule().deletePendingKey(publicKeyBase64);
    }
}
