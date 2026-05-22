import { privateKeyToAccount } from "viem/accounts";
import { bytesToHex } from "@noble/hashes/utils";
import { Keypair as SolanaKeypair } from "@solana/web3.js";

import type { Chain } from "../../../chains/chains";
import type { ServerSignerConfig } from "../../types";
import { deriveKeyBytes } from "../../../utils/server-key-derivation";
import { ed25519KeypairFromSeed, encodeStellarPublicKey } from "../../../utils/stellar";
import { getChainType } from "./get-chain-type";

export function deriveServerSignerAddress(keyBytes: Uint8Array, chain: Chain): string {
    const chainType = getChainType(chain);
    switch (chainType) {
        case "evm":
            return privateKeyToAccount(`0x${bytesToHex(keyBytes)}`).address;
        case "solana":
            return SolanaKeypair.fromSeed(keyBytes).publicKey.toBase58();
        case "stellar":
            return encodeStellarPublicKey(ed25519KeypairFromSeed(keyBytes).publicKey);
    }
}

export function deriveServerSignerDetails(
    signer: ServerSignerConfig,
    chain: Chain,
    projectId: string,
    environment: string
): { derivedKeyBytes: Uint8Array; derivedAddress: string } {
    if (typeof window !== "undefined") {
        throw new Error("Server signers can only be used from server-side code.");
    }

    const chainType = getChainType(chain);
    const derivedKeyBytes = deriveKeyBytes(signer.secret, projectId, environment, chainType);
    const derivedAddress = deriveServerSignerAddress(derivedKeyBytes, chain);
    return { derivedKeyBytes, derivedAddress };
}

export function deriveServerSignerCandidates(
    signer: ServerSignerConfig,
    chain: Chain,
    projectId: string,
    environment: string
): {
    primary: { derivedKeyBytes: Uint8Array; derivedAddress: string };
    legacy: { derivedKeyBytes: Uint8Array; derivedAddress: string } | null;
} {
    if (typeof window !== "undefined") {
        throw new Error("Server signers can only be used from server-side code.");
    }

    const chainType = getChainType(chain);

    // Primary: use normalized chain type ("evm" | "solana" | "stellar")
    const primaryBytes = deriveKeyBytes(signer.secret, projectId, environment, chainType);
    const primaryAddress = deriveServerSignerAddress(primaryBytes, chain);

    // Legacy: chain-specific derivation (only matters for EVM where chain !== chainType)
    const chainStr = typeof chain === "string" ? chain : String(chain);
    let legacy: { derivedKeyBytes: Uint8Array; derivedAddress: string } | null = null;
    if (chainType === "evm" && chainStr !== "evm") {
        const legacyBytes = deriveKeyBytes(signer.secret, projectId, environment, chainStr);
        const legacyAddress = deriveServerSignerAddress(legacyBytes, chain);
        legacy = { derivedKeyBytes: legacyBytes, derivedAddress: legacyAddress };
    }

    return { primary: { derivedKeyBytes: primaryBytes, derivedAddress: primaryAddress }, legacy };
}
