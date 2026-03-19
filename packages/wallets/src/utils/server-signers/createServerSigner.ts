import { randomBytes } from "@noble/hashes/utils";
import { bytesToHex } from "@noble/hashes/utils";
import type { ServerSignerConfig } from "../../signers/types";

/**
 * Creates a server signer configuration with a cryptographically random secret.
 *
 * The generated secret is a 32-byte hex string suitable for use as a server signer
 * secret in wallet creation and signer registration.
 *
 * Server signers can only be used from server-side code.
 *
 * @returns A server signer configuration containing the type and generated secret.
 *
 * @example
 * ```ts
 * const recovery = createServerSigner();
 * const wallet = await sdk.createWallet({
 *     chain: "base-sepolia",
 *     recovery,
 *     owner: "userId:test",
 * });
 * ```
 */
export function createServerSigner(): ServerSignerConfig {
    if (typeof window !== "undefined") {
        throw new Error("Server signers can only be used from server-side code.");
    }

    const secretBytes = randomBytes(32);
    const secret = bytesToHex(secretBytes);

    return {
        type: "server",
        secret,
    };
}
