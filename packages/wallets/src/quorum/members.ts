import type { QuorumSigner, SignerLocator } from "../signers/types";

// EVM addresses ignore case, so `external-wallet:0x…` locators compare in lowercase (Kotlin `isSameLocator`).
// Every other locator compares exactly; callers pass locators from getSignerLocator, which normalizes emails.
function comparableLocator(locator: string): string {
    if (locator.startsWith("external-wallet:0x")) {
        return locator.toLowerCase();
    }
    return locator;
}

export function isSameSignerLocator(left: string, right: string): boolean {
    return comparableLocator(left) === comparableLocator(right);
}

/** Every quorum that lists `memberLocator` as a member. */
export function quorumsWithMember(quorums: QuorumSigner[], memberLocator: SignerLocator): QuorumSigner[] {
    return quorums.filter((quorum) =>
        quorum.members.some((member) => isSameSignerLocator(member.locator, memberLocator))
    );
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
    const leftSet = new Set(left.map(comparableLocator));
    const rightSet = new Set(right.map(comparableLocator));
    return (
        leftSet.size === left.length &&
        rightSet.size === right.length &&
        leftSet.size === rightSet.size &&
        right.every((locator) => leftSet.has(comparableLocator(locator)))
    );
}
