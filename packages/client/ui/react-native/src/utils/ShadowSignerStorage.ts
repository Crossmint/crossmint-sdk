import type { ShadowSignerStorage, ShadowSignerData } from "@crossmint/wallets-sdk";
import { SecureStorage } from "./SecureStorage";

export class ReactNativeShadowSignerStorage implements ShadowSignerStorage {
    private readonly SHADOW_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";
    private secureStorage = new SecureStorage();

    async storePrivateKey(walletAddress: string, privateKey: CryptoKey): Promise<void> {
        try {
            const privateKeyBuffer = await window.crypto.subtle.exportKey("raw", privateKey);
            const privateKeyBytes = new Uint8Array(privateKeyBuffer);

            const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyBytes));

            await this.secureStorage.set(`${this.SHADOW_SIGNER_STORAGE_KEY}_key_${walletAddress}`, privateKeyBase64);
        } catch (error) {
            console.error("Failed to store private key:", error);
            throw error;
        }
    }

    async getPrivateKey(walletAddress: string): Promise<CryptoKey | null> {
        try {
            const stored = await this.secureStorage.get(`${this.SHADOW_SIGNER_STORAGE_KEY}_key_${walletAddress}`);
            if (!stored) {
                return null;
            }

            const privateKeyBytes = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));

            return await window.crypto.subtle.importKey(
                "raw",
                privateKeyBytes,
                {
                    name: "Ed25519",
                    namedCurve: "Ed25519",
                } as AlgorithmIdentifier,
                false,
                ["sign"]
            );
        } catch (error) {
            console.warn("Failed to retrieve private key from SecureStorage:", error);
            return null;
        }
    }

    async removePrivateKey(walletAddress: string): Promise<void> {
        try {
            await this.secureStorage.remove(`${this.SHADOW_SIGNER_STORAGE_KEY}_key_${walletAddress}`);
        } catch (error) {
            console.error("Failed to remove private key:", error);
            throw error;
        }
    }

    async storeMetadata(walletAddress: string, data: ShadowSignerData): Promise<void> {
        try {
            await this.secureStorage.set(
                `${this.SHADOW_SIGNER_STORAGE_KEY}_meta_${walletAddress}`,
                JSON.stringify(data)
            );
        } catch (error) {
            console.error("Failed to store metadata:", error);
            throw error;
        }
    }

    async getMetadata(walletAddress: string): Promise<ShadowSignerData | null> {
        try {
            const stored = await this.secureStorage.get(`${this.SHADOW_SIGNER_STORAGE_KEY}_meta_${walletAddress}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn("Failed to retrieve metadata from SecureStorage:", error);
            return null;
        }
    }
}
