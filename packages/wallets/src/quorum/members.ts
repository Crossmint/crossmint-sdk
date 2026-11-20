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
    const leftSet = new Set(left.map(memberKey));
    const rightSet = new Set(right.map(memberKey));
    return (
        leftSet.size === left.length &&
        rightSet.size === right.length &&
        leftSet.size === rightSet.size &&
        right.every((locator) => leftSet.has(memberKey(locator)))
    );
}

// A server member and an external wallet at the same address are the same key, and the API lists a
// recovery quorum's server member as `external-wallet:` while it lists a delegated one as `server:`.
function memberKey(locator: string): string {
    return comparableLocator(
        locator.startsWith(SERVER_PREFIX) ? `external-wallet:${locator.slice(SERVER_PREFIX.length)}` : locator
    );
}

const SERVER_PREFIX = "server:";

/** True when a pending request's designated members are known and differ from the ones the caller now gives. */
export function designatesOtherMembers(
    designated: string[] | null | undefined,
    requested: string[] | undefined
): boolean {
    return designated != null && requested != null && !isSameLocatorSet(designated, requested);
}
