import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { bytesToHex } from "@noble/hashes/utils";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { Keypair as StellarKeypair } from "@stellar/stellar-sdk";

import type { Chain } from "../../chains/chains";
import type { Signer, ServerInternalSignerConfig, ServerSignerConfig } from "../types";
import { deriveKeyBytes, deriveAlias } from "../../utils/server-key-derivation";
import { EVMServerSigner } from "./evm-server-signer";
import { SolanaServerSigner } from "./solana-server-signer";
import { StellarServerSigner } from "./stellar-server-signer";

export { EVMServerSigner } from "./evm-server-signer";
export { SolanaServerSigner } from "./solana-server-signer";
export { StellarServerSigner } from "./stellar-server-signer";

export function assembleServerSigner(chain: Chain, config: ServerInternalSignerConfig): Signer<"server"> {
    const chainType = getChainType(chain);
    switch (chainType) {
        case "evm":
            return new EVMServerSigner(config);
        case "solana":
            return new SolanaServerSigner(config);
        case "stellar":
            return new StellarServerSigner(config);
    }
}

export function deriveServerSignerAddress(keyBytes: Uint8Array, chain: Chain): string {
    const chainType = getChainType(chain);
    switch (chainType) {
        case "evm":
            return privateKeyToAccount(`0x${bytesToHex(keyBytes)}`).address;
        case "solana":
            return SolanaKeypair.fromSeed(keyBytes).publicKey.toBase58();
        case "stellar":
            return StellarKeypair.fromRawEd25519Seed(Buffer.from(keyBytes)).publicKey();
    }
}

export function deriveServerSignerDetails(
    signer: ServerSignerConfig,
    chain: Chain,
    projectId: string,
    environment: string
): { derivedKeyBytes: Uint8Array; derivedAddress: string; alias: string } {
    const chainStr = typeof chain === "string" ? chain : String(chain);
    const derivedKeyBytes = deriveKeyBytes(signer.secret, projectId, environment, chainStr);
    const derivedAddress = deriveServerSignerAddress(derivedKeyBytes, chain);
    const alias = deriveAlias(signer.secret, projectId, environment, chainStr);
    return { derivedKeyBytes, derivedAddress, alias };
}

/**
 * Generates a throwaway admin signer for server-key wallets.
 *
 * The private key is intentionally discarded so that the derived delegated server signer
 * becomes the sole axis of control. This is by design: the server key (derived deterministically
 * from the user's secret) is the only signer that can authorise transactions.
 *
 * Because the admin key is irrecoverable, privileged admin operations (e.g. adding/removing
 * signers) are permanently locked. Key "rotation" is achieved by creating a new wallet with
 * a new secret rather than mutating the existing wallet's signer set.
 */
export function generateEphemeralAdminSigner(chain: Chain): { type: "external-wallet"; address: string } {
    const chainType = getChainType(chain);
    switch (chainType) {
        case "evm": {
            const account = privateKeyToAccount(generatePrivateKey());
            return { type: "external-wallet", address: account.address };
        }
        case "solana": {
            const keypair = SolanaKeypair.generate();
            return { type: "external-wallet", address: keypair.publicKey.toBase58() };
        }
        case "stellar": {
            const keypair = StellarKeypair.random();
            return { type: "external-wallet", address: keypair.publicKey() };
        }
    }
}

function getChainType(chain: Chain): "evm" | "solana" | "stellar" {
    if (chain === "solana") return "solana";
    if (chain === "stellar") return "stellar";
    return "evm";
}
