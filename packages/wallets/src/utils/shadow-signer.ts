import { encode as encodeBase58 } from "bs58";
import type { Chain } from "../chains/chains";
import type { RegisterSignerParams } from "../api/types";

const SHADOW_SIGNER_STORAGE_KEY = "crossmint_shadow_signer";

export type ShadowSignerData = {
    chain: Chain;
    walletAddress: string;
    publicKey: string;
    createdAt: number;
};

export type ShadowSignerResult = {
    delegatedSigner: RegisterSignerParams;
    publicKey: string;
};

/**
 * Generate a shadow signer for the given chain.
 * For Solana/Stellar: Creates an ed25519 keypair and returns external-wallet signer
 * For EVM chains: Creates a p256 passkey credential
 */
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
        const publicKeyBase58 = encodeBase58(new Uint8Array(publicKeyBuffer));

        return {
            delegatedSigner: { signer: `external-wallet:${publicKeyBase58}` },
            publicKey: publicKeyBase58,
        };
    }
    // TODO: Add support for EVM chains
    throw new Error("Unsupported chain");
}

/**
 * Store shadow signer metadata in localStorage
 */
export function storeShadowSigner(walletAddress: string, chain: Chain, publicKey: string, name?: string): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    const data: ShadowSignerData = {
        chain,
        walletAddress,
        publicKey,
        createdAt: Date.now(),
    };

    localStorage.setItem(`${SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`, JSON.stringify(data));
}

/**
 * Retrieve shadow signer metadata from localStorage
 */
export function getShadowSigner(walletAddress: string): ShadowSignerData | null {
    if (typeof localStorage === "undefined") {
        return null;
    }
    const stored = localStorage.getItem(`${SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`);
    return stored ? JSON.parse(stored) : null;
}

/**
 * Check if a shadow signer exists for the given wallet
 */
export function hasShadowSigner(walletAddress: string): boolean {
    return getShadowSigner(walletAddress) !== null;
}

/**
 * Remove shadow signer metadata from localStorage
 */
export function removeShadowSigner(walletAddress: string): void {
    if (typeof localStorage === "undefined") {
        return;
    }
    localStorage.removeItem(`${SHADOW_SIGNER_STORAGE_KEY}_${walletAddress}`);
}
