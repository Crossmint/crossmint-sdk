import { requireNativeModule } from "expo-modules-core";
import * as Device from "expo-device";
import { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

/**
 * Error thrown when a native device signer operation fails.
 *
 * `code` is the stable machine code surfaced by the native module (for example
 * `DEVICE_SIGNER_SIGNING_FAILED` or `DEVICE_SIGNER_KEY_NOT_FOUND`) so callers and
 * error reporters can branch and group on it without parsing the message. The
 * original native error is preserved on `cause` for the full underlying detail.
 */
export class DeviceSignerNativeError extends Error {
    readonly code: string;
    readonly cause?: unknown;

    constructor(code: string, message: string, options?: { cause?: unknown }) {
        super(message);
        this.name = "DeviceSignerNativeError";
        this.code = code;
        this.cause = options?.cause;
    }
}

function toDeviceSignerNativeError(error: unknown): DeviceSignerNativeError {
    const nativeCode = (error as { code?: unknown } | null | undefined)?.code;
    const code = typeof nativeCode === "string" && nativeCode.length > 0 ? nativeCode : "DEVICE_SIGNER_NATIVE_ERROR";
    // The native message already names the operation (Expo prefixes "Calling the '<fn>'
    // function has failed"), so pass it through as-is and keep code + cause structured.
    const message = error instanceof Error ? error.message : String(error);
    return new DeviceSignerNativeError(code, message, { cause: error });
}

interface CrossmintDeviceSignerModule {
    isAvailable(): Promise<boolean>;
    generateKey(address: string | null): Promise<string>;
    mapAddressToKey(address: string, publicKeyBase64: string): Promise<void>;
    getKey(address: string): Promise<string | null>;
    hasKey(publicKeyBase64: string): Promise<boolean>;
    signMessage(address: string, message: string): Promise<{ r: string; s: string }>;
    deleteKey(address: string): Promise<void>;
    deletePendingKey(publicKeyBase64: string): Promise<void>;
}

let _nativeModule: CrossmintDeviceSignerModule | null = null;

function getNativeModule(): CrossmintDeviceSignerModule {
    if (_nativeModule == null) {
        try {
            _nativeModule = requireNativeModule<CrossmintDeviceSignerModule>("CrossmintDeviceSigner");
        } catch {
            throw new Error(
                "CrossmintDeviceSigner native module is not available. " +
                    "This typically means you are running in Expo Go, which does not support custom native modules. " +
                    "Use a development build (`npx expo run:ios` / `npx expo run:android`) or EAS Build, " +
                    "or use SoftwareDeviceSignerKeyStorage as a fallback for development."
            );
        }
    }
    return _nativeModule;
}

export class NativeDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    constructor() {
        super("");
    }

    async generateKey(params: { address?: string }): Promise<string> {
        try {
            return await getNativeModule().generateKey(params.address ?? null);
        } catch (error) {
            throw toDeviceSignerNativeError(error);
        }
    }

    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        try {
            return await getNativeModule().mapAddressToKey(address, publicKeyBase64);
        } catch (error) {
            throw toDeviceSignerNativeError(error);
        }
    }

    getKey(address: string): Promise<string | null> {
        return getNativeModule().getKey(address);
    }

    hasKey(publicKeyBase64: string): Promise<boolean> {
        return getNativeModule().hasKey(publicKeyBase64);
    }

    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        try {
            return await getNativeModule().signMessage(address, message);
        } catch (error) {
            throw toDeviceSignerNativeError(error);
        }
    }

    async deleteKey(address: string): Promise<void> {
        try {
            return await getNativeModule().deleteKey(address);
        } catch (error) {
            throw toDeviceSignerNativeError(error);
        }
    }

    async deletePendingKey(publicKeyBase64: string): Promise<void> {
        try {
            return await getNativeModule().deletePendingKey(publicKeyBase64);
        } catch (error) {
            throw toDeviceSignerNativeError(error);
        }
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
