import { encode as encodeBase58 } from "bs58";
import type { Chain } from "@/chains/chains";
import { encodeEd25519PublicKey } from "./encodeEd25519PublicKey";
import { BrowserShadowSignerStorage } from "./shadow-signer-storage-browser";
import type { BaseExternalWalletSignerConfig, EVM256KeypairSignerConfig } from "@crossmint/common-sdk-base";

export type ShadowSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    publicKeyBase64: string;
    createdAt: number;
};

export type ShadowSignerResult = {
    shadowSigner: BaseExternalWalletSignerConfig | EVM256KeypairSignerConfig;
    publicKey: string;
};

export interface ShadowSignerStorage {
    keyGenerator(chain: Chain): Promise<string>;
    sign(publicKey: string, data: Uint8Array): Promise<Uint8Array>;
    storeMetadata(walletAddress: string, data: ShadowSignerData): Promise<void>;
    getMetadata(walletAddress: string): Promise<ShadowSignerData | null>;
}

export function getStorage(): ShadowSignerStorage {
    const isReactNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
    const isExpo = typeof global !== "undefined" && (global as { expo?: unknown }).expo;

    if (isReactNative || isExpo) {
        throw new Error("ReactNativeShadowSignerStorage must be provided explicitly for React Native environments");
    } else {
        return new BrowserShadowSignerStorage();
    }
}

export async function generateShadowSigner<C extends Chain>(
    chain: C,
    storage?: ShadowSignerStorage
): Promise<ShadowSignerResult & { publicKeyBase64: string }> {
    const storageInstance = storage ?? getStorage();
    const publicKeyBase64 = await storageInstance.keyGenerator(chain);

    if (chain === "solana" || chain === "stellar") {
        const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
        const publicKeyBytes = new Uint8Array(publicKeyBuffer);

        let encodedPublicKey: string;
        if (chain === "stellar") {
            // Stellar uses Ed25519 encoding (Base32 with version byte and checksum)
            encodedPublicKey = encodeEd25519PublicKey(publicKeyBytes);
        } else if (chain === "solana") {
            // Solana uses Base58 encoding
            encodedPublicKey = encodeBase58(publicKeyBytes);
        } else {
            throw new Error("Unsupported chain");
        }

        return {
            shadowSigner: {
                type: "external-wallet",
                address: encodedPublicKey,
            },
            publicKey: encodedPublicKey,
            publicKeyBase64,
        };
    }

    // For EVM chains, extract x and y coordinates from P256 public key
    const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
    const publicKeyBytes = new Uint8Array(publicKeyBuffer);

    // P256 public key format: 1 byte (0x04) + 32 bytes (x) + 32 bytes (y)
    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
        throw new Error("Invalid P256 public key format");
    }

    return {
        shadowSigner: {
            type: "evm-p256-keypair",
            publicKey: publicKeyBase64,
            chain,
        },
        publicKey: publicKeyBase64,
        publicKeyBase64,
    };
}

export async function storeShadowSigner(
    walletAddress: string,
    chain: Chain,
    publicKey: string,
    publicKeyBase64: string,
    storage?: ShadowSignerStorage
): Promise<void> {
    const storageInstance = storage ?? getStorage();
    try {
        console.log("[storeShadowSigner] Storing metadata for wallet:", walletAddress, "publicKey:", publicKey);

        const data: ShadowSignerData = {
            chain,
            walletAddress,
            publicKey,
            publicKeyBase64,
            createdAt: Date.now(),
        };

        await storageInstance.storeMetadata(walletAddress, data);
        console.log("[storeShadowSigner] Metadata stored successfully");
    } catch (error) {
        console.error("Failed to store shadow signer metadata:", error);
        throw error;
    }
}

export async function getShadowSigner(
    walletAddress: string,
    storage?: ShadowSignerStorage
): Promise<ShadowSignerData | null> {
    const storageInstance = storage ?? getStorage();
    try {
        console.log("[getShadowSigner] Getting shadow signer for wallet:", walletAddress);
        const result = await storageInstance.getMetadata(walletAddress);
        console.log("[getShadowSigner] Result:", result ? "found" : "not found");
        return result;
    } catch (error) {
        console.warn("[getShadowSigner] Failed to get shadow signer:", error);
        return null;
    }
}

export async function hasShadowSigner(walletAddress: string, storage?: ShadowSignerStorage): Promise<boolean> {
    const shadowSigner = await getShadowSigner(walletAddress, storage);
    return shadowSigner !== null;
}
