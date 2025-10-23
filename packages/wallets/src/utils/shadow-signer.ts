import { encode as encodeBase58 } from "bs58";
import { StrKey } from "@stellar/stellar-sdk";
import type { Chain } from "../chains/chains";
import type { RegisterSignerParams } from "../api/types";

const SHADOW_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";
const SHADOW_SIGNER_DB_NAME = "crossmint_shadow_keys";
const SHADOW_SIGNER_DB_STORE = "keys";

export type ShadowSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    createdAt: number;
};

export type ShadowSignerResult = {
    shadowSigner: RegisterSignerParams;
    publicKey: string;
    privateKey: CryptoKey;
};

async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SHADOW_SIGNER_DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(SHADOW_SIGNER_DB_STORE)) {
                db.createObjectStore(SHADOW_SIGNER_DB_STORE);
            }
        };
    });
}

export async function generateShadowSigner(chain: Chain): Promise<ShadowSignerResult> {
    if (chain === "solana" || chain === "stellar") {
        const keyPair = (await window.crypto.subtle.generateKey(
            {
                name: "Ed25519",
                namedCurve: "Ed25519",
            } as any,
            false,
            ["sign", "verify"]
        )) as CryptoKeyPair;

        const publicKeyBuffer = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
        const publicKeyBytes = new Uint8Array(publicKeyBuffer);

        let encodedPublicKey: string;
        if (chain === "stellar") {
            // Stellar uses StrKey encoding (Base32 with version byte and checksum)
            encodedPublicKey = StrKey.encodeEd25519PublicKey(Buffer.from(publicKeyBytes));
        } else {
            // Solana uses Base58 encoding
            encodedPublicKey = encodeBase58(publicKeyBytes);
        }

        return {
            shadowSigner: { signer: `external-wallet:${encodedPublicKey}` },
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
    if (typeof localStorage === "undefined" || typeof indexedDB === "undefined") {
        return;
    }

    const db = await openDB();
    const tx = db.transaction([SHADOW_SIGNER_DB_STORE], "readwrite");
    const store = tx.objectStore(SHADOW_SIGNER_DB_STORE);
    store.put(privateKey, walletAddress);

    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });

    const data: ShadowSignerData = {
        chain,
        walletAddress,
        publicKey,
        createdAt: Date.now(),
    };

    localStorage.setItem(`${SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`, JSON.stringify(data));
}

export function getShadowSigner(walletAddress: string): ShadowSignerData | null {
    if (typeof localStorage === "undefined") {
        return null;
    }
    const stored = localStorage.getItem(`${SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`);
    return stored ? JSON.parse(stored) : null;
}

export async function getShadowSignerPrivateKey(walletAddress: string): Promise<CryptoKey | null> {
    if (typeof indexedDB === "undefined") {
        return null;
    }

    try {
        const db = await openDB();
        const tx = db.transaction([SHADOW_SIGNER_DB_STORE], "readonly");
        const store = tx.objectStore(SHADOW_SIGNER_DB_STORE);
        const request = store.get(walletAddress);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn("Failed to retrieve shadow signer private key:", error);
        return null;
    }
}

export function hasShadowSigner(walletAddress: string): boolean {
    return getShadowSigner(walletAddress) !== null;
}
