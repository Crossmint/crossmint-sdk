import type { Chain } from "../chains/chains";
import type { QuorumLocator, QuorumMemberConfig } from "../signers/types";
import { hasQuorumLocatorPrefix } from "../utils/signer-locator";
import { QuorumApprovingMembersRequiredError } from "../utils/errors";
import type { ApprovingMember } from "../wallets/types";
import { quorumMemberLocator, type ServerMemberDerivation } from "./config";

/**
 * The approving members a request sends, as locators, or undefined when none are given. Throws when the chain requires
 * them and the acting signer is a quorum: the SDK never picks members for the caller.
 */
export function approvingMemberLocators(
    members: ApprovingMember[] | undefined,
    { acting, required, derivation }: { acting: string; required: boolean; derivation: ServerMemberDerivation }
): string[] | undefined {
    if (required && hasQuorumLocatorPrefix(acting) && (members == null || members.length === 0)) {
        throw new QuorumApprovingMembersRequiredError(acting as QuorumLocator);
    }
    return members?.map((member) =>
        typeof member === "string" ? member : quorumMemberLocator(member as QuorumMemberConfig<Chain>, derivation)
    );
}
