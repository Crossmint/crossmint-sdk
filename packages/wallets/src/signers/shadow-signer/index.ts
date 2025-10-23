import { encode as encodeBase58 } from "bs58";
import type { Chain } from "@/chains/chains";
import type { RegisterSignerParams } from "@/api/types";
import { encodeEd25519PublicKey } from "./encodeEd25519PublicKey";
import { BrowserShadowSignerStorage } from "./shadow-signer-storage-browser";
import { ReactNativeShadowSignerStorage } from "./shadow-signer-storage-rn";

export type ShadowSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    createdAt: number;
};

export type ShadowSignerResult = {
    delegatedSigner: RegisterSignerParams;
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
            storageInstance = new ReactNativeShadowSignerStorage();
        } else {
            storageInstance = new BrowserShadowSignerStorage();
        }
    }
    return storageInstance;
}

export async function generateShadowSigner(chain: Chain): Promise<ShadowSignerResult> {
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
            delegatedSigner: { signer: `external-wallet:${encodedPublicKey}` },
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
    privateKey: CryptoKey
): Promise<void> {
    const storage = getStorage();
    try {
        await storage.storePrivateKey(walletAddress, privateKey);

        const data: ShadowSignerData = {
            chain,
            walletAddress,
            publicKey,
            createdAt: Date.now(),
        };

        await storage.storeMetadata(walletAddress, data);
    } catch (error) {
        console.warn("Failed to store shadow signer:", error);
    }
}

export async function getShadowSigner(walletAddress: string): Promise<ShadowSignerData | null> {
    const storage = getStorage();
    try {
        return await storage.getMetadata(walletAddress);
    } catch (error) {
        console.warn("Failed to get shadow signer:", error);
        return null;
    }
}

export async function getShadowSignerPrivateKey(walletAddress: string): Promise<CryptoKey | null> {
    const storage = getStorage();
    try {
        return await storage.getPrivateKey(walletAddress);
    } catch (error) {
        console.warn("Failed to retrieve shadow signer private key:", error);
        return null;
    }
}

export async function hasShadowSigner(walletAddress: string): Promise<boolean> {
    const signer = await getShadowSigner(walletAddress);
    return signer !== null;
}
