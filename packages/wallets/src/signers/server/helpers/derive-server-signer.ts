import { privateKeyToAccount } from "viem/accounts";
import { bytesToHex } from "@noble/hashes/utils";
import { Keypair as SolanaKeypair } from "@solana/web3.js";

import type { Chain } from "../../../chains/chains";
import type { DerivedServerSigner, ServerSignerConfig } from "../../types";
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
): DerivedServerSigner {
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
    primary: DerivedServerSigner;
    legacy: DerivedServerSigner | null;
} {
    if (typeof window !== "undefined") {
        throw new Error("Server signers can only be used from server-side code.");
    }

    const chainType = getChainType(chain);

    const primaryBytes = deriveKeyBytes(signer.secret, projectId, environment, chainType);
    const primaryAddress = deriveServerSignerAddress(primaryBytes, chain);
    const primary = { derivedKeyBytes: primaryBytes, derivedAddress: primaryAddress };

    // Legacy: chain-specific derivation (only matters for EVM where chain !== chainType)
    const chainStr = typeof chain === "string" ? chain : String(chain);
    if (chainType === "evm" && chainStr !== "evm") {
        const legacyBytes = deriveKeyBytes(signer.secret, projectId, environment, chainStr);
        const legacyAddress = deriveServerSignerAddress(legacyBytes, chain);
        return { primary, legacy: { derivedKeyBytes: legacyBytes, derivedAddress: legacyAddress } };
    }

    return { primary, legacy: null };
}
