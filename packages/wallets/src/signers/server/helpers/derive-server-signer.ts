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

    const chainStr = typeof chain === "string" ? chain : String(chain);
    const derivedKeyBytes = deriveKeyBytes(signer.secret, projectId, environment, chainStr);
    const derivedAddress = deriveServerSignerAddress(derivedKeyBytes, chain);
    return { derivedKeyBytes, derivedAddress };
}
