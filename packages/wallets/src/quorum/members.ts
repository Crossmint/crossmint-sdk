import type { QuorumSigner, SignerLocator } from "../signers/types";

// Members are compared by exact locator. Callers pass locators from getSignerLocator, which normalizes emails.

/** Every quorum that lists `memberLocator` as a member. */
export function quorumsWithMember(quorums: QuorumSigner[], memberLocator: SignerLocator): QuorumSigner[] {
    return quorums.filter((quorum) => quorum.members.some((member) => member.locator === memberLocator));
}

/** Every quorum with exactly this threshold and member set, in any order. Repeated locators never match. */
export function quorumsWithComposition(
    quorums: QuorumSigner[],
    threshold: number,
    memberLocators: SignerLocator[]
): QuorumSigner[] {
    return quorums.filter(
        (quorum) =>
            quorum.threshold === threshold &&
            isSameLocatorSet(
                quorum.members.map((member) => member.locator),
                memberLocators
            )
    );
}

function isSameLocatorSet(left: string[], right: string[]): boolean {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    return (
        leftSet.size === left.length &&
        rightSet.size === right.length &&
        leftSet.size === rightSet.size &&
        right.every((locator) => leftSet.has(locator))
    );
}
