import { encode as encodeBase58 } from "bs58";
import type { Chain } from "@/chains/chains";
import { encodeEd25519PublicKey } from "../../utils/encodeEd25519PublicKey";
import { BrowserShadowSignerStorage } from "./shadow-signer-storage-browser";
import type { BaseExternalWalletSignerConfig } from "@crossmint/common-sdk-base";

export { ShadowSigner } from "./shadow-signer";
export { SolanaShadowSigner } from "./solana-shadow-signer";
export { StellarShadowSigner } from "./stellar-shadow-signer";

export type ShadowSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    publicKeyBase64: string;
    createdAt: number;
};

export type ShadowSignerResult = {
    shadowSigner: BaseExternalWalletSignerConfig;
    publicKey: string;
};

export interface ShadowSignerStorage {
    keyGenerator(): Promise<string>;
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
            shadowSigner: {
                type: "external-wallet",
                address: encodedPublicKey,
            },
            publicKey: encodedPublicKey,
            publicKeyBase64,
        };
    }
    // TODO: Add support for EVM chains
    throw new Error("Unsupported chain");
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
