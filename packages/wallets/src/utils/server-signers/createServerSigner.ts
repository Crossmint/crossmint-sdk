import type { Chain } from "../../chains/chains";
import { deriveKeyBytes } from "../server-key-derivation";
import { deriveServerSignerAddress } from "../../signers/server/helpers/derive-server-signer";
import { getChainType } from "../../signers/server/helpers/get-chain-type";

export type CreateServerSignerParams = {
    secret: string;
    chain: Chain;
    projectId: string;
    environment: string;
};

export type ServerSigner = {
    type: "server";
    address: string;
    keyBytes: Uint8Array;
};

/**
 * Creates a server signer by deriving a chain-specific key pair from a master secret using HKDF-SHA256.
 *
 * The derivation is deterministic: same inputs always produce the same signer.
 *
 * @param params.secret - Master secret (with or without xmsk1_ prefix), 64-char hex
 * @param params.chain - Target blockchain chain
 * @param params.projectId - Project ID from the API key
 * @param params.environment - Environment from the API key (staging, production)
 * @returns A server signer containing the type, derived address, and key bytes.
 *
 * @example
 * ```ts
 * const signer = createServerSigner({
 *     secret: "xmsk1_abc123...",
 *     chain: "base-sepolia",
 *     projectId: "project-id",
 *     environment: "staging",
 * });
 * // signer = { type: "server", address: "0x...", keyBytes: Uint8Array }
 * ```
 */
export function createServerSigner(params: CreateServerSignerParams): ServerSigner {
    const { secret, chain, projectId, environment } = params;
    const chainType = getChainType(chain);
    const keyBytes = deriveKeyBytes(secret, projectId, environment, chainType);
    const address = deriveServerSignerAddress(keyBytes, chain);

    return { type: "server", address, keyBytes };
}
