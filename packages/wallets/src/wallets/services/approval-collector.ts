import {
    planMemberApprovals,
    splitPendingApprovals,
    type FlatPendingApproval,
    type MemberApprovalLimit,
    type PlannedMemberApproval,
} from "../../quorum/approvals";
import type { SignApprovalMessage, SignerAdapter } from "../../signers/types";
import { InvalidSignerError } from "../../utils/errors";
import { isSameSignerLocator } from "../../utils/signer-locator";
import type { Approval, PendingApproval } from "../types";

/** The keys this client holds, the chain's approval signing, and the device key fallback for flat entries. */
export type ApprovalSigning = {
    held: SignerAdapter[];
    limit: MemberApprovalLimit;
    sign: SignApprovalMessage;
    resolveMissing: (locator: string) => Promise<SignerAdapter | null>;
};

/**
 * Signs every flat entry, in parallel, then the held members of each quorum one after another,
 * so two signing prompts never open at once. An empty result means there is nothing to submit.
 */
export async function collectApprovals(pending: PendingApproval[], signing: ApprovalSigning): Promise<Approval[]> {
    const { flat, quorums } = splitPendingApprovals(pending);
    const approvals = await Promise.all(flat.map((entry) => signFlatEntry(entry, signing)));
    const heldLocators = signing.held.map((signer) => signer.locator());
    for (const planned of planMemberApprovals(quorums, heldLocators, signing.limit)) {
        approvals.push(await signMember(planned, signing));
    }
    return approvals;
}

async function signFlatEntry({ signer: { locator }, message }: FlatPendingApproval, signing: ApprovalSigning) {
    const signer =
        signing.held.find((held) => isSameSignerLocator(held.locator(), locator)) ??
        (await signing.resolveMissing(locator));
    return await signAs(signer, locator, message, signing);
}

// planMemberApprovals plans held members only, so the member's signer is always found.
async function signMember({ memberLocator, message }: PlannedMemberApproval, signing: ApprovalSigning) {
    const signer = signing.held.find((held) => isSameSignerLocator(held.locator(), memberLocator));
    return await signAs(signer, memberLocator, message, signing);
}

async function signAs(
    signer: SignerAdapter | null | undefined,
    locator: string,
    message: string,
    signing: ApprovalSigning
): Promise<Approval> {
    if (signer == null) {
        throw new InvalidSignerError(`Signer ${locator} not found in pending approvals`);
    }
    return { ...(await signing.sign(signer, message)), signer: locator };
}
