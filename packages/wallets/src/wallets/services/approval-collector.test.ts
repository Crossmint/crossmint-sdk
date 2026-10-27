import { describe, expect, it, vi } from "vitest";
import type { QuorumMember, SignerAdapter } from "../../signers/types";
import { InvalidSignerError } from "../../utils/errors";
import type { PendingApproval } from "../types";
import { createQuorumApiEntry, createQuorumPendingApproval } from "../__tests__/test-helpers";
import { collectApprovals, type ApprovalSigning } from "./approval-collector";

const FLAT_LOCATOR = "external-wallet:0x1111111111111111111111111111111111111111";
const DEVICE_LOCATOR = "device:BIPYZpIg4Lg5rkUxuCVy8vg1UcXkPq0bTJnRmuJcK8Vh";

const flatApproval = (locator: string = FLAT_LOCATOR, message = "0xflat"): PendingApproval =>
    ({
        signer: { type: "external-wallet", address: locator.slice(locator.indexOf(":") + 1), locator },
        message,
    }) as PendingApproval;

// Only a held key's locator matters to the collector: signing goes through `sign`.
const heldSigner = (locator: string) => ({ locator: () => locator }) as unknown as SignerAdapter;

// Each signature names the key that signed and the message it signed.
const signatureOf = (locator: string, message: string) => `${locator} signed ${message}`;

const signWithHeldKey = async (signer: SignerAdapter, message: string) => ({
    signature: signatureOf(signer.locator(), message),
});

const createSigning = (overrides: Partial<ApprovalSigning> = {}): ApprovalSigning => ({
    held: [],
    limit: "remaining",
    sign: vi.fn(signWithHeldKey),
    resolveMissing: vi.fn(async () => null),
    ...overrides,
});

const memberMessages = (entry: ReturnType<typeof createQuorumPendingApproval>) =>
    entry.quorumApprovals.pending.map(({ member, message }) => ({ locator: member.locator, message }));

const approvalsSignedBy = (members: Array<{ locator: string; message: string }>) =>
    members.map(({ locator, message }) => ({ signature: signatureOf(locator, message), signer: locator }));

describe("collectApprovals", () => {
    describe("for a flat entry", () => {
        describe("when a held signer has the entry's locator", () => {
            it("signs the entry's message with that signer", async () => {
                const signing = createSigning({ held: [heldSigner(FLAT_LOCATOR)] });

                const approvals = await collectApprovals([flatApproval()], signing);

                expect(approvals).toEqual(approvalsSignedBy([{ locator: FLAT_LOCATOR, message: "0xflat" }]));
                expect(signing.resolveMissing).not.toHaveBeenCalled();
            });
        });

        describe("when no held signer has the entry's locator", () => {
            it("signs with the signer the device key store resolves", async () => {
                const signing = createSigning({ resolveMissing: vi.fn(async () => heldSigner(DEVICE_LOCATOR)) });

                const approvals = await collectApprovals([flatApproval(DEVICE_LOCATOR)], signing);

                expect(signing.resolveMissing).toHaveBeenCalledWith(DEVICE_LOCATOR);
                expect(approvals).toEqual(approvalsSignedBy([{ locator: DEVICE_LOCATOR, message: "0xflat" }]));
            });

            it("throws InvalidSignerError naming the locator and signs nothing", async () => {
                const signing = createSigning();

                const collecting = collectApprovals([flatApproval()], signing);

                await expect(collecting).rejects.toThrow(InvalidSignerError);
                await expect(collecting).rejects.toThrow(`Signer ${FLAT_LOCATOR} not found in pending approvals`);
                expect(signing.sign).not.toHaveBeenCalled();
            });
        });
    });

    describe("for a quorum entry", () => {
        it("signs each held pending member over the member's own message, as that member", async () => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
            const entry = createQuorumPendingApproval({ quorum });
            const [first, second] = memberMessages(entry);
            const signing = createSigning({ held: [heldSigner(first.locator), heldSigner(second.locator)] });

            const approvals = await collectApprovals([entry], signing);

            expect(approvals).toEqual(approvalsSignedBy([first, second]));
        });

        it("skips the members this client does not hold", async () => {
            const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry({ threshold: 2 }) });
            const [, second] = memberMessages(entry);

            const approvals = await collectApprovals([entry], createSigning({ held: [heldSigner(second.locator)] }));

            expect(approvals).toEqual(approvalsSignedBy([second]));
        });

        it("returns no approval and asks no device key store when no member is held", async () => {
            const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry() });
            const signing = createSigning({ held: [heldSigner(FLAT_LOCATOR)] });

            const approvals = await collectApprovals([entry], signing);

            expect(approvals).toEqual([]);
            expect(signing.sign).not.toHaveBeenCalled();
            expect(signing.resolveMissing).not.toHaveBeenCalled();
        });

        it("returns no approval for a quorum that needs no more approvals", async () => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
            const [firstSigned, secondSigned, waiting] = quorum.members;
            const entry = createQuorumPendingApproval({
                quorum,
                pending: [waiting],
                submitted: [firstSigned, secondSigned],
            });

            const approvals = await collectApprovals([entry], createSigning({ held: [heldSigner(waiting.locator)] }));

            expect(approvals).toEqual([]);
        });

        it("does not sign again for a member that already submitted", async () => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
            const [signed, ...waiting] = quorum.members;
            const entry = createQuorumPendingApproval({ quorum, pending: waiting, submitted: [signed] });

            const approvals = await collectApprovals([entry], createSigning({ held: [heldSigner(signed.locator)] }));

            expect(approvals).toEqual([]);
        });

        describe.each([
            { limit: "remaining" as const, signedCount: 2, behaviour: "signs at most the approvals the quorum still needs" },
            { limit: "all" as const, signedCount: 3, behaviour: "signs every held pending member" },
        ])("when the limit is $limit", ({ limit, signedCount, behaviour }) => {
            it(`${behaviour}, in pending order`, async () => {
                const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry({ threshold: 2 }) });
                const members = memberMessages(entry);
                const held = members.map(({ locator }) => heldSigner(locator));

                const approvals = await collectApprovals([entry], createSigning({ held, limit }));

                expect(approvals).toEqual(approvalsSignedBy(members.slice(0, signedCount)));
            });
        });

        it("matches a held EVM key whose address differs only in case and approves as the pending spelling", async () => {
            const quorum = createQuorumApiEntry({ threshold: 1, memberCount: 1 });
            const pendingLocator = "external-wallet:0xabcdef0123456789abcdef0123456789abcdef01";
            const member: QuorumMember = {
                type: "external-wallet",
                address: pendingLocator.slice("external-wallet:".length),
                locator: pendingLocator,
            };
            const entry = createQuorumPendingApproval({ quorum: { ...quorum, members: [member] }, pending: [member] });
            const heldKey = heldSigner("external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01");
            const signing = createSigning({ held: [heldKey] });

            const approvals = await collectApprovals([entry], signing);

            const [{ message }] = memberMessages(entry);
            expect(signing.sign).toHaveBeenCalledWith(heldKey, message);
            expect(approvals.map(({ signer }) => signer)).toEqual([pendingLocator]);
        });

        it("signs the held members one after another", async () => {
            const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry({ threshold: 2 }) });
            const [first, second] = memberMessages(entry);
            let finishFirstSignature = () => {};
            const sign = vi
                .fn(signWithHeldKey)
                .mockImplementationOnce(
                    (signer, message) =>
                        new Promise((resolve) => {
                            finishFirstSignature = () => resolve({ signature: signatureOf(signer.locator(), message) });
                        })
                );
            const held = [heldSigner(first.locator), heldSigner(second.locator)];

            const collecting = collectApprovals([entry], createSigning({ held, sign }));
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(sign).toHaveBeenCalledTimes(1);
            finishFirstSignature();
            expect(await collecting).toEqual(approvalsSignedBy([first, second]));
            expect(sign).toHaveBeenCalledTimes(2);
        });

        describe("when a member's signature fails", () => {
            it("throws that error and does not ask the next member", async () => {
                const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry({ threshold: 2 }) });
                const [first, second] = memberMessages(entry);
                const cancelled = new Error("The user cancelled the signature");
                const sign = vi.fn(signWithHeldKey).mockRejectedValueOnce(cancelled);
                const held = [heldSigner(first.locator), heldSigner(second.locator)];

                await expect(collectApprovals([entry], createSigning({ held, sign }))).rejects.toBe(cancelled);
                expect(sign).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe("for flat and quorum entries in one request", () => {
        it("returns the flat approvals first, then the members in pending order", async () => {
            const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry({ threshold: 2 }) });
            const [first, second] = memberMessages(entry);
            const held = [heldSigner(second.locator), heldSigner(FLAT_LOCATOR), heldSigner(first.locator)];

            const approvals = await collectApprovals([entry, flatApproval()], createSigning({ held }));

            expect(approvals).toEqual(
                approvalsSignedBy([{ locator: FLAT_LOCATOR, message: "0xflat" }, first, second])
            );
        });
    });
});
