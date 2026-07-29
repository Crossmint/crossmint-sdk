import type { Chain } from "../chains/chains";
import type { ResolvedQuorumMember, ServerSignerConfig, SignerConfigForChain } from "../signers/types";
import { getSignerLocator } from "./signer-locator";
import { normalizeEmail } from "./signer-validation";

/**
 * Locator of a resolved quorum member. API-sourced members carry their locator; for members
 * that don't (e.g. caller-supplied configs on the no-API-config fallback path), fall back to
 * deriving one from the config fields.
 */
export function getQuorumMemberLocator(member: ResolvedQuorumMember): string {
    if (typeof member.locator === "string") {
        return member.locator;
    }
    if (member.type === "server" && member.address != null) {
        return `server:${member.address}`;
    }
    return getSignerLocator(member as SignerConfigForChain<Chain>) as string;
}

/**
 * Whether a caller-supplied signer config identifies the given quorum member.
 *
 * Matching is per-type, mirroring the existing-wallet quorum validation:
 * - server: the candidate's derivable addresses (primary and legacy) must include the member's
 *   API address — secrets are never compared. Derivation is injected so callers can plug their
 *   own provider (factory: fresh derivation; wallet: `ServerSignerResolver.candidateAddresses`).
 * - passkey: by `id` when given, else by `name`, else permissive (callers layer count-based
 *   disambiguation on top).
 * - email: normalized comparison; phone: exact; external-wallet: exact address.
 * Null-tolerant on candidate fields to preserve the factory's permissive semantics.
 */
export function matchesQuorumMember(
    candidate: { type: string } & Record<string, unknown>,
    member: ResolvedQuorumMember,
    serverCandidateAddresses: (config: ServerSignerConfig) => string[]
): boolean {
    if (candidate.type !== member.type) {
        return false;
    }
    if (candidate.type === "server") {
        if (member.address == null || typeof (candidate as { secret?: unknown }).secret !== "string") {
            return false;
        }
        return serverCandidateAddresses(candidate as unknown as ServerSignerConfig).includes(member.address);
    }
    if (candidate.type === "passkey") {
        if (candidate.id != null) {
            return member.id === candidate.id;
        }
        if (candidate.name != null) {
            return member.name === candidate.name;
        }
        return true;
    }
    if (candidate.type === "email") {
        return (
            candidate.email == null ||
            normalizeEmail(String(candidate.email)) === normalizeEmail(String(member.email ?? ""))
        );
    }
    if (candidate.type === "phone") {
        return candidate.phone == null || candidate.phone === member.phone;
    }
    return candidate.address === member.address;
}
