import {
    hasQuorumLocatorPrefix,
    requireQuorumLocator,
    type QuorumLocator,
    type QuorumSigner,
    type SignerLocator,
} from "../signers/types";
import { QuorumSelectionAmbiguousError } from "../utils/errors";
import { isSameSignerLocator, quorumsWithMember } from "./members";

/**
 * What the held key signs as. `self`: the single signer `locator`. `quorum`: a member of that quorum.
 * `none`: signer changes only, the key can authorize none.
 */
export type ActingRole =
    | { kind: "self"; locator: SignerLocator }
    | { kind: "quorum"; locator: QuorumLocator }
    | { kind: "none" };

type RoleInputBase = {
    heldLocator: SignerLocator;
    /** The call's explicit signer, used as given; a `quorum:` locator must have a valid id. */
    explicit?: SignerLocator;
    /** Recovery methods that sign alone. */
    recoveryLocators: SignerLocator[];
    recoveryQuorums: QuorumSigner[];
};

// Signer changes take no delegated input: only recovery methods and recovery quorums can authorize them.
export type RoleInput =
    | (RoleInputBase & { scope: "transaction"; delegatedQuorums: QuorumSigner[]; isRegisteredSigner: boolean })
    | (RoleInputBase & { scope: "signer-change" });

/** Throws QuorumSelectionAmbiguousError when the held key is a member of several quorums in scope. */
export function resolveActingRole(input: RoleInput): ActingRole {
    const { heldLocator, explicit } = input;
    if (explicit != null) {
        return roleFromLocator(explicit);
    }
    // Returns the stored spelling, which can differ in case for EVM addresses (Kotlin parity).
    const recoveryLocator = input.recoveryLocators.find((locator) => isSameSignerLocator(locator, heldLocator));
    if (recoveryLocator != null) {
        return { kind: "self", locator: recoveryLocator };
    }
    if (input.scope === "signer-change") {
        return singleQuorumRole(quorumsWithMember(input.recoveryQuorums, heldLocator)) ?? { kind: "none" };
    }
    if (input.isRegisteredSigner) {
        return { kind: "self", locator: heldLocator };
    }
    const quorums = quorumsWithMember([...input.recoveryQuorums, ...input.delegatedQuorums], heldLocator);
    return singleQuorumRole(quorums) ?? { kind: "self", locator: heldLocator };
}

function roleFromLocator(locator: SignerLocator): ActingRole {
    if (hasQuorumLocatorPrefix(locator)) {
        return { kind: "quorum", locator: requireQuorumLocator(locator) };
    }
    return { kind: "self", locator };
}

function singleQuorumRole(quorums: QuorumSigner[]): ActingRole | null {
    if (quorums.length > 1) {
        throw new QuorumSelectionAmbiguousError(quorums.map((quorum) => quorum.locator));
    }
    if (quorums.length === 0) {
        return null;
    }
    return { kind: "quorum", locator: quorums[0].locator };
}
