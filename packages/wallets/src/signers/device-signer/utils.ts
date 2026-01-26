import { encode as encodeBase58 } from "bs58";
import type { Chain } from "@/chains/chains";
import { encodeEd25519PublicKey } from "../../utils/encodeEd25519PublicKey";
import { BrowserDeviceSignerStorage } from "./device-signer-storage-browser";
import type { DeviceSignerConfig } from "../types";

export type DeviceSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    publicKeyBase64: string;
    createdAt: number;
};

export type DeviceSignerResult = {
    deviceSigner: DeviceSignerConfig;
    publicKeyBase64: string;
};

export interface DeviceSignerStorage {
    keyGenerator(): Promise<string>;
    sign(publicKey: string, data: Uint8Array): Promise<Uint8Array>;
    storeMetadata(walletAddress: string, data: DeviceSignerData): Promise<void>;
    getMetadata(walletAddress: string): Promise<DeviceSignerData | null>;
}

export function getStorage(): DeviceSignerStorage {
    const isReactNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
    const isExpo = typeof global !== "undefined" && (global as { expo?: unknown }).expo;

    if (isReactNative || isExpo) {
        throw new Error("ReactNativeDeviceSignerStorage must be provided explicitly for React Native environments");
    } else {
        return new BrowserDeviceSignerStorage();
    }
}

export async function generateDeviceSigner<C extends Chain>(
    chain: C,
    storage?: DeviceSignerStorage
): Promise<DeviceSignerResult> {
    const storageInstance = storage ?? getStorage();
    if (chain === "solana" || chain === "stellar") {
        const publicKeyBase64 = await storageInstance.keyGenerator();
        const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
        const publicKeyBytes = new Uint8Array(publicKeyBuffer);

        let encodedPublicKey: string;
        if (chain === "stellar") {
            // Stellar uses Ed25519 encoding (Base32 with version byte and checksum)
            encodedPublicKey = encodeEd25519PublicKey(publicKeyBytes);
        } else {
            // Solana uses Base58 encoding
            encodedPublicKey = encodeBase58(publicKeyBytes);
        }

        return {
            deviceSigner: {
                type: "device",
                address: encodedPublicKey,
            },
            // We need to return the public key base64 here because its the only way to retrieve the private key from the storage
            // as Stellar and Solana encoded the public key after storing the private key
            publicKeyBase64,
        };
    }
    // TODO: Add support for EVM chains
    throw new Error("Unsupported chain");
}

export async function storeDeviceSigner(
    walletAddress: string,
    chain: Chain,
    publicKey: string,
    publicKeyBase64: string,
    storage?: DeviceSignerStorage
): Promise<void> {
    const storageInstance = storage ?? getStorage();
    try {
        console.log("[storeDeviceSigner] Storing metadata for wallet:", walletAddress, "publicKey:", publicKey);

        const data: DeviceSignerData = {
            chain,
            walletAddress,
            publicKey,
            publicKeyBase64,
            createdAt: Date.now(),
        };

        await storageInstance.storeMetadata(walletAddress, data);
        console.log("[storeDeviceSigner] Metadata stored successfully");
    } catch (error) {
        console.error("Failed to store shadow signer metadata:", error);
        throw error;
    }
}

export async function getDeviceSigner(
    walletAddress: string,
    storage?: DeviceSignerStorage
): Promise<DeviceSignerData | null> {
    const storageInstance = storage ?? getStorage();
    try {
        console.log("[getDeviceSigner] Getting shadow signer for wallet:", walletAddress);
        const result = await storageInstance.getMetadata(walletAddress);
        console.log("[getDeviceSigner] Result:", result ? "found" : "not found");
        return result;
    } catch (error) {
        console.warn("[getDeviceSigner] Failed to get shadow signer:", error);
        return null;
    }
}

export async function hasDeviceSigner(walletAddress: string, storage?: DeviceSignerStorage): Promise<boolean> {
    const deviceSigner = await getDeviceSigner(walletAddress, storage);
    return deviceSigner !== null;
}
