import { encode as encodeBase58 } from "bs58";
import type { Chain } from "@/chains/chains";
import { encodeEd25519PublicKey } from "./encodeEd25519PublicKey";
import { BrowserShadowSignerStorage } from "./shadow-signer-storage-browser";
import type { BaseExternalWalletSignerConfig } from "@crossmint/common-sdk-base";

export type ShadowSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    createdAt: number;
};

export type ShadowSignerResult = {
    shadowSigner: BaseExternalWalletSignerConfig;
    publicKey: string;
    privateKey: CryptoKey;
};

export interface ShadowSignerStorage {
    storePrivateKey(walletAddress: string, privateKey: CryptoKey): Promise<void>;
    getPrivateKey(walletAddress: string): Promise<CryptoKey | null>;
    removePrivateKey(walletAddress: string): Promise<void>;
    storeMetadata(walletAddress: string, data: ShadowSignerData): Promise<void>;
    getMetadata(walletAddress: string): Promise<ShadowSignerData | null>;
}

let storageInstance: ShadowSignerStorage | null = null;

function getStorage(): ShadowSignerStorage {
    if (!storageInstance) {
        const isReactNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
        const isExpo = typeof global !== "undefined" && (global as { expo?: unknown }).expo;

        if (isReactNative || isExpo) {
            throw new Error("ReactNativeShadowSignerStorage must be provided explicitly for React Native environments");
        } else {
            storageInstance = new BrowserShadowSignerStorage();
        }
    }
    return storageInstance;
}

export async function generateShadowSigner<C extends Chain>(chain: C): Promise<ShadowSignerResult> {
    if (chain === "solana" || chain === "stellar") {
        const keyPair = (await window.crypto.subtle.generateKey(
            {
                name: "Ed25519",
                namedCurve: "Ed25519",
            } as AlgorithmIdentifier,
            false,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const publicKeyBuffer = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
        const publicKeyBytes = new Uint8Array(publicKeyBuffer);

        let encodedPublicKey: string;
        if (chain === "stellar") {
            encodedPublicKey = encodeEd25519PublicKey(publicKeyBytes);
        } else {
            encodedPublicKey = encodeBase58(publicKeyBytes);
        }

        return {
            shadowSigner: {
                type: "external-wallet",
                address: encodedPublicKey,
            },
            publicKey: encodedPublicKey,
            privateKey: keyPair.privateKey,
        };
    }
    // TODO: Add support for EVM chains
    throw new Error("Unsupported chain");
}

export async function storeShadowSigner(
    walletAddress: string,
    chain: Chain,
    publicKey: string,
    privateKey: CryptoKey,
    storage?: ShadowSignerStorage
): Promise<void> {
    const storageInstance = storage ?? getStorage();
    try {
        await storageInstance.storePrivateKey(walletAddress, privateKey);

        const data: ShadowSignerData = {
            chain,
            walletAddress,
            publicKey,
            createdAt: Date.now(),
        };

        await storageInstance.storeMetadata(walletAddress, data);
    } catch (error) {
        console.warn("Failed to store shadow signer:", error);
    }
}

export async function getShadowSigner(
    walletAddress: string,
    storage?: ShadowSignerStorage
): Promise<ShadowSignerData | null> {
    const storageInstance = storage ?? getStorage();
    try {
        return await storageInstance.getMetadata(walletAddress);
    } catch (error) {
        console.warn("Failed to get shadow signer:", error);
        return null;
    }
}

export async function getShadowSignerPrivateKey(
    walletAddress: string,
    storage?: ShadowSignerStorage
): Promise<CryptoKey | null> {
    const storageInstance = storage ?? getStorage();
    try {
        return await storageInstance.getPrivateKey(walletAddress);
    } catch (error) {
        console.warn("Failed to retrieve shadow signer private key:", error);
        return null;
    }
}

export async function hasShadowSigner(walletAddress: string, storage?: ShadowSignerStorage): Promise<boolean> {
    return (
        (await getShadowSigner(walletAddress, storage)) !== null &&
        (await getShadowSignerPrivateKey(walletAddress, storage)) !== null
    );
}
