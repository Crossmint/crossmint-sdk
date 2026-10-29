import type { QuorumSigner, SignerLocator } from "../signers/types";
import { comparableLocator, isSameSignerLocator } from "../utils/signer-locator";

/** Every quorum that lists `memberLocator` as a member. */
export function quorumsWithMember<Q extends QuorumSigner>(quorums: Q[], memberLocator: SignerLocator | string): Q[] {
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
