import type { Chain } from "../../chains/chains";
import { deriveKeyBytes } from "../server-key-derivation";
import { deriveServerSignerAddress } from "../../signers/server/helpers/derive-server-signer";
import { getChainType } from "../../signers/server/helpers/get-chain-type";
import { assembleServerSigner } from "../../signers/server/assemble-server-signer";

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
    /**
     * Signs a message the API asks this signer to approve, such as `approvals.pending[].message` on a transaction
     * or signature, or a quorum member's `quorumApprovals.pending[].message`. Signs exactly as the SDK does when
     * this server signer approves on its own, and returns the signature to post under `server:<address>`.
     *
     * The message is in the encoding the API returns for the chain:
     * - EVM: 0x-prefixed hex, signed as a raw EIP-191 personal message; returns a 0x-prefixed signature.
     * - Solana: base58, signed with ed25519; returns a base58 signature.
     * - Stellar: base64, signed with ed25519; returns a base64 signature.
     */
    sign: (message: string) => Promise<string>;
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
 * @returns A server signer containing the type, derived address, key bytes, and a `sign` function.
 *
 * @example
 * ```ts
 * const signer = createServerSigner({
 *     secret: "xmsk1_abc123...",
 *     chain: "base-sepolia",
 *     projectId: "project-id",
 *     environment: "staging",
 * });
 * // signer = { type: "server", address: "0x...", keyBytes: Uint8Array, sign }
 * const signature = await signer.sign(pending.message);
 * ```
 */
export function createServerSigner(params: CreateServerSignerParams): ServerSigner {
    const { secret, chain, projectId, environment } = params;
    const chainType = getChainType(chain);
    const keyBytes = deriveKeyBytes(secret, projectId, environment, chainType);
    const address = deriveServerSignerAddress(keyBytes, chain);
    // The adapter wipes the bytes it is given, so hand it a copy and leave `keyBytes` intact for the caller.
    const adapter = assembleServerSigner(chain, {
        type: "server",
        derivedKeyBytes: keyBytes.slice(),
        locator: `server:${address}`,
        address,
    });

    return {
        type: "server",
        address,
        keyBytes,
        sign: async (message) => (await adapter.signMessage(message)).signature,
    };
}
