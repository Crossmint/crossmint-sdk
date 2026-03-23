import "react-native-get-random-values";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { p256 } from "@noble/curves/p256";

import { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";

const STORE_PREFIX = "crossmint_device_signer_";
const PENDING_KEY_PREFIX = `${STORE_PREFIX}pending_`;
const ADDRESS_KEY_PREFIX = `${STORE_PREFIX}addr_`;
const PUBLIC_KEY_INDEX_KEY = `${STORE_PREFIX}pub_key_index`;

type ExpoGlobal = typeof globalThis & {
    expo?: {
        modules?: {
            ExpoCrypto?: {
                getRandomValues: (array: Uint8Array) => void;
            };
        };
    };
};

type CryptoLike = {
    getRandomValues: (array: Uint8Array) => void;
};

/**
 * Converts a base64/base64url string back into padded canonical base64.
 */
function toBase64(base64: string): string {
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const remainder = normalized.length % 4;

    if (remainder === 0) {
        return normalized;
    }
    if (remainder === 2) {
        return `${normalized}==`;
    }
    if (remainder === 3) {
        return `${normalized}=`;
    }

    throw new Error("Invalid base64url string");
}

/**
 * Converts a public-key string into canonical base64 for comparisons and API usage.
 */
function normalizePublicKeyEncoding(publicKey: string): string {
    return toBase64(publicKey);
}

/**
 * Converts a public-key string into a SecureStore-safe key.
 */
function safeStoreKey(publicKey: string): string {
    return normalizePublicKeyEncoding(publicKey).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Converts a hex string to a Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Converts a Uint8Array to a hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Converts a Uint8Array to a base64 string.
 */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(toBase64(base64));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function fillRandomBytes(bytes: Uint8Array): Uint8Array {
    if (globalThis.crypto?.getRandomValues != null) {
        (globalThis.crypto as CryptoLike).getRandomValues(bytes);
        return bytes;
    }

    const expoCrypto = (globalThis as ExpoGlobal).expo?.modules?.ExpoCrypto;
    if (expoCrypto?.getRandomValues != null) {
        expoCrypto.getRandomValues(bytes);
        return bytes;
    }

    throw new Error("No secure random source is available for software device signer key generation");
}

function generatePrivateKey(): Uint8Array {
    // Rejection sampling avoids modulo bias; retries are vanishingly rare for P-256.
    for (let attempt = 0; attempt < 8; attempt++) {
        const privateKey = fillRandomBytes(new Uint8Array(32));
        if (p256.utils.isValidPrivateKey(privateKey)) {
            return privateKey;
        }
    }

    throw new Error("Failed to generate a valid P-256 private key");
}

/**
 * Software-based implementation of DeviceSignerKeyStorage for environments
 * where native modules are not available (e.g. Expo Go).
 *
 * Uses @noble/curves for P-256 key generation and signing, and expo-secure-store
 * for encrypted key persistence. This provides the same interface as
 * NativeDeviceSignerKeyStorage but without hardware-backed security
 * (Secure Enclave / Android Keystore).
 *
 * Suitable for development and prototyping in Expo Go. For production use,
 * prefer NativeDeviceSignerKeyStorage with a development build.
 */
export class SoftwareDeviceSignerKeyStorage extends DeviceSignerKeyStorage {
    constructor() {
        super("");
    }

    async generateKey(params: { address?: string }): Promise<string> {
        const privateKey = generatePrivateKey();
        const publicKeyBytes = p256.getPublicKey(privateKey, false); // uncompressed
        const publicKeyBase64 = bytesToBase64(publicKeyBytes);
        const privateKeyHex = bytesToHex(privateKey);

        if (params.address != null) {
            await SecureStore.setItemAsync(`${ADDRESS_KEY_PREFIX}${params.address}`, privateKeyHex);
            await SecureStore.setItemAsync(
                `${ADDRESS_KEY_PREFIX}${params.address}_pub`,
                normalizePublicKeyEncoding(publicKeyBase64)
            );
        } else {
            await SecureStore.setItemAsync(`${PENDING_KEY_PREFIX}${safeStoreKey(publicKeyBase64)}`, privateKeyHex);
        }

        await this.trackPublicKey(publicKeyBase64);
        return publicKeyBase64;
    }

    async mapAddressToKey(address: string, publicKeyBase64: string): Promise<void> {
        const pendingKey = `${PENDING_KEY_PREFIX}${safeStoreKey(publicKeyBase64)}`;
        const privateKeyHex = await SecureStore.getItemAsync(pendingKey);
        if (privateKeyHex == null) {
            throw new Error(`No pending key found for public key: ${publicKeyBase64}`);
        }

        await SecureStore.setItemAsync(`${ADDRESS_KEY_PREFIX}${address}`, privateKeyHex);
        await SecureStore.setItemAsync(
            `${ADDRESS_KEY_PREFIX}${address}_pub`,
            normalizePublicKeyEncoding(publicKeyBase64)
        );
        await SecureStore.deleteItemAsync(pendingKey);
    }

    async getKey(address: string): Promise<string | null> {
        const publicKey = await SecureStore.getItemAsync(`${ADDRESS_KEY_PREFIX}${address}_pub`);
        return publicKey == null ? null : normalizePublicKeyEncoding(publicKey);
    }

    async hasKey(publicKeyBase64: string): Promise<boolean> {
        const index = await this.getPublicKeyIndex();
        const normalizedPublicKey = normalizePublicKeyEncoding(publicKeyBase64);
        return index.some((key) => normalizePublicKeyEncoding(key) === normalizedPublicKey);
    }

    async signMessage(address: string, message: string): Promise<{ r: string; s: string }> {
        const privateKeyHex = await SecureStore.getItemAsync(`${ADDRESS_KEY_PREFIX}${address}`);
        if (privateKeyHex == null) {
            throw new Error(`No key found for address: ${address}`);
        }

        const privateKey = hexToBytes(privateKeyHex);
        const messageBytes = base64ToBytes(message);
        // Match the native implementations, which sign the decoded message bytes using the
        // platform P-256 primitives. Those primitives apply SHA-256 before ECDSA signing.
        const signature = p256.sign(messageBytes, privateKey, { lowS: true, prehash: true });

        return {
            r: `0x${signature.r.toString(16).padStart(64, "0")}`,
            s: `0x${signature.s.toString(16).padStart(64, "0")}`,
        };
    }

    async deleteKey(address: string): Promise<void> {
        const publicKeyBase64 = await SecureStore.getItemAsync(`${ADDRESS_KEY_PREFIX}${address}_pub`);
        await SecureStore.deleteItemAsync(`${ADDRESS_KEY_PREFIX}${address}`);
        await SecureStore.deleteItemAsync(`${ADDRESS_KEY_PREFIX}${address}_pub`);
        if (publicKeyBase64 != null) {
            await this.untrackPublicKey(publicKeyBase64);
        }
    }

    async deletePendingKey(publicKeyBase64: string): Promise<void> {
        await SecureStore.deleteItemAsync(`${PENDING_KEY_PREFIX}${safeStoreKey(publicKeyBase64)}`);
        await this.untrackPublicKey(publicKeyBase64);
    }

    getDeviceName(): string {
        const model = Device.deviceName ?? Device.modelName ?? Device.brand;
        const os = Device.osName;

        if (model != null && os != null) {
            return `${model} (${os})`;
        }

        return model ?? os ?? "Unknown Device";
    }

    // --- Public key index management (persisted in SecureStore) ---

    private async getPublicKeyIndex(): Promise<string[]> {
        const raw = await SecureStore.getItemAsync(PUBLIC_KEY_INDEX_KEY);
        if (raw == null) {
            return [];
        }
        try {
            return JSON.parse(raw) as string[];
        } catch {
            return [];
        }
    }

    private async savePublicKeyIndex(index: string[]): Promise<void> {
        await SecureStore.setItemAsync(PUBLIC_KEY_INDEX_KEY, JSON.stringify(index));
    }

    private async trackPublicKey(publicKeyBase64: string): Promise<void> {
        const index = await this.getPublicKeyIndex();
        const normalizedPublicKey = normalizePublicKeyEncoding(publicKeyBase64);
        if (!index.some((key) => normalizePublicKeyEncoding(key) === normalizedPublicKey)) {
            index.push(normalizedPublicKey);
            await this.savePublicKeyIndex(index);
        }
    }

    private async untrackPublicKey(publicKeyBase64: string): Promise<void> {
        const index = await this.getPublicKeyIndex();
        const normalizedPublicKey = normalizePublicKeyEncoding(publicKeyBase64);
        const filtered = index.filter((key) => normalizePublicKeyEncoding(key) !== normalizedPublicKey);
        await this.savePublicKeyIndex(filtered);
    }
}
