import {
    isQuorumSigner,
    requireQuorumLocator,
    requireQuorumMemberLocator,
    type QuorumLocator,
    type QuorumMemberLocator,
    type SignerLocator,
} from "../signers/types";
import type { PendingApproval } from "../wallets/types";
import { isSameSignerLocator } from "../utils/signer-locator";

export type QuorumPendingApproval = Extract<PendingApproval, { signer: { type: "quorum" } }>;
export type FlatPendingApproval = Exclude<PendingApproval, QuorumPendingApproval>;

/** How many held members sign per quorum: at most the approvals it still needs, or every held one (D3). */
export type MemberApprovalLimit = "remaining" | "all";

export type PlannedMemberApproval = {
    quorum: QuorumLocator;
    memberLocator: QuorumMemberLocator;
    message: string;
};

export function isQuorumPendingApproval(entry: PendingApproval): entry is QuorumPendingApproval {
    return isQuorumSigner(entry.signer);
}

export function splitPendingApprovals(pending: PendingApproval[]): {
    flat: FlatPendingApproval[];
    quorums: QuorumPendingApproval[];
} {
    const flat: FlatPendingApproval[] = [];
    const quorums: QuorumPendingApproval[] = [];
    for (const entry of pending) {
        if (isQuorumPendingApproval(entry)) {
            quorums.push(entry);
        } else {
            flat.push(entry);
        }
    }
    return { flat, quorums };
}

/** True when only quorum members can move the operation forward: no flat signer is pending. */
// Stellar seeds one entry per auth entry, so a quorum's request can also carry a single-signer entry for another
// party's address; EVM and Solana seed one entry per request, so there the list has one kind only.
export function awaitsQuorumOnly(operation: { status: string; approvals?: { pending: PendingApproval[] } }): boolean {
    if (operation.status !== "awaiting-approval" || operation.approvals == null) {
        return false;
    }
    const { flat, quorums } = splitPendingApprovals(operation.approvals.pending);
    return flat.length === 0 && quorums.some((entry) => entry.quorumApprovals.remaining > 0);
}

/** True when a quorum still needs approvals and none of the held keys is one of its members, pending or submitted. */
export function quorumsAwaitOnlyOthers(quorums: QuorumPendingApproval[], heldLocators: string[]): boolean {
    const isHeld = (locator: string) => heldLocators.some((held) => isSameSignerLocator(held, locator));
    const awaiting = quorums.filter((entry) => entry.quorumApprovals.remaining > 0);
    return (
        awaiting.length > 0 &&
        !awaiting.some((entry) =>
            [...entry.quorumApprovals.pending, ...entry.quorumApprovals.submitted].some(({ member }) =>
                isHeld(member.locator)
            )
        )
    );
}

/** Which pending member messages the held keys sign, per quorum, in pending order. */
export function planMemberApprovals(
    quorums: QuorumPendingApproval[],
    heldLocators: SignerLocator[],
    limit: MemberApprovalLimit
): PlannedMemberApproval[] {
    const isHeld = (locator: string) => heldLocators.some((held) => isSameSignerLocator(held, locator));
    const planned: PlannedMemberApproval[] = [];
    for (const entry of quorums) {
        const { remaining, pending } = entry.quorumApprovals;
        const heldEntries = pending.filter(({ member }) => isHeld(member.locator));
        // A satisfied quorum needs no member, whatever the limit. Unheld quorums and members are never validated.
        if (remaining <= 0 || heldEntries.length === 0) {
            continue;
        }
        const quorum = requireQuorumLocator(entry.signer.locator);
        const heldPending = heldEntries.map(({ member, message }) => ({
            quorum,
            memberLocator: requireQuorumMemberLocator(member.locator),
            message,
        }));
        const count = limit === "remaining" ? remaining : heldPending.length;
        planned.push(...heldPending.slice(0, count));
    }
    return planned;
}
