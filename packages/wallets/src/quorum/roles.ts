import {
    hasQuorumLocatorPrefix,
    requireQuorumLocator,
    type QuorumLocator,
    type QuorumSigner,
    type SignerLocator,
} from "../signers/types";
import { QuorumSelectionAmbiguousError } from "../utils/errors";
import { isSameSignerLocator, quorumsWithMember } from "./members";

/** What the held key signs as: itself, a quorum it belongs to, or nothing (signer changes only). */
export type ActingRole =
    | { kind: "self"; locator: SignerLocator }
    | { kind: "quorum"; locator: QuorumLocator }
    | { kind: "none" };

/** The key this client holds and what it may match against on the wallet. */
export type HeldKey = {
    held: SignerLocator;
    /** The call's `signer` option, used as given; a `quorum:` locator must carry a valid id. */
    explicitSigner?: SignerLocator;
    /** Recovery methods that sign alone, by their stored locator. */
    recoveryMethodLocators: SignerLocator[];
    recoveryQuorums: QuorumSigner[];
};

export type TransactionHeldKey = HeldKey & {
    delegatedQuorums: QuorumSigner[];
    /** Registered as a delegated signer on the request's chain. */
    registeredOnChain: boolean;
};

/** EDD 007 §7 "Role" for a transaction or signature: explicit → recovery method → registered signer → sole quorum → self. */
export function resolveTransactionRole(key: TransactionHeldKey): ActingRole {
    const fixed = explicitOrRecoveryRole(key);
    if (fixed != null) {
        return fixed;
    }
    if (key.registeredOnChain) {
        return { kind: "self", locator: key.held };
    }
    const quorums = quorumsWithMember([...key.recoveryQuorums, ...key.delegatedQuorums], key.held);
    return soleQuorumRole(quorums) ?? { kind: "self", locator: key.held };
}

/** For a signer change: explicit → recovery method → sole recovery quorum → none. Delegated quorums never authorize one. */
export function resolveSignerChangeRole(key: HeldKey): ActingRole {
    const fixed = explicitOrRecoveryRole(key);
    if (fixed != null) {
        return fixed;
    }
    return soleQuorumRole(quorumsWithMember(key.recoveryQuorums, key.held)) ?? { kind: "none" };
}

// The two rules both scopes share, before membership is looked at.
function explicitOrRecoveryRole({ held, explicitSigner, recoveryMethodLocators }: HeldKey): ActingRole | null {
    if (explicitSigner != null) {
        return explicitRole(explicitSigner);
    }
    // The stored spelling wins: an EVM address can differ in case from the held one (Kotlin parity).
    const stored = recoveryMethodLocators.find((locator) => isSameSignerLocator(locator, held));
    if (stored == null) {
        return null;
    }
    return { kind: "self", locator: stored };
}

function explicitRole(locator: SignerLocator): ActingRole {
    if (hasQuorumLocatorPrefix(locator)) {
        return { kind: "quorum", locator: requireQuorumLocator(locator) };
    }
    return { kind: "self", locator };
}

/** The one quorum the key belongs to; throws when there are several, null when there is none. */
function soleQuorumRole(quorums: QuorumSigner[]): ActingRole | null {
    if (quorums.length > 1) {
        throw new QuorumSelectionAmbiguousError(quorums.map((quorum) => quorum.locator));
    }
    if (quorums.length === 0) {
        return null;
    }
    return { kind: "quorum", locator: quorums[0].locator };
}
