import { describe, expect, it } from "vitest";
import type { PendingApproval } from "../wallets/types";
import { createQuorumApiEntry, createQuorumPendingApproval } from "../wallets/__tests__/test-helpers";
import { awaitsQuorumOnly, planMemberApprovals, splitPendingApprovals, toQuorumProgress } from "./approvals";

const flatApproval = (): PendingApproval => ({
    signer: { type: "api-key", address: "0x1234567890123456789012345678901234567890", locator: "api-key" },
    message: "0x01",
});

describe("splitPendingApprovals", () => {
    it("separates flat entries from quorum entries and keeps the order of each", () => {
        const firstFlat = flatApproval();
        const secondFlat = flatApproval();
        const firstQuorum = createQuorumPendingApproval({ quorum: createQuorumApiEntry() });
        const secondQuorum = createQuorumPendingApproval({ quorum: createQuorumApiEntry() });

        const { flat, quorums } = splitPendingApprovals([firstFlat, firstQuorum, secondFlat, secondQuorum]);

        expect(flat).toEqual([firstFlat, secondFlat]);
        expect(quorums).toEqual([firstQuorum, secondQuorum]);
    });
});

describe("toQuorumProgress", () => {
    it("returns the quorum locator, counts and the pending and submitted member locators", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const [submittedMember, ...pendingMembers] = quorum.members;
        const entry = createQuorumPendingApproval({ quorum, pending: pendingMembers, submitted: [submittedMember] });

        expect(toQuorumProgress(entry)).toEqual({
            quorum: quorum.locator,
            threshold: 2,
            remaining: 1,
            pending: pendingMembers.map((member) => member.locator),
            submitted: [submittedMember.locator],
        });
    });

    it("throws for a malformed quorum locator", () => {
        const entry = {
            ...createQuorumPendingApproval({ quorum: createQuorumApiEntry() }),
            signer: { type: "quorum" as const, locator: "3f9c2b8e-5d1a-8c4f-9e2b-7a6d5c4b3a21" },
        };

        expect(() => toQuorumProgress(entry)).toThrow("Malformed quorum locator: 3f9c2b8e-5d1a-8c4f-9e2b-7a6d5c4b3a21");
    });

    it.each(["pending", "submitted"] as const)(
        "throws for a %s member locator that cannot belong to a quorum",
        (list) => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
            const [submittedMember, ...pendingMembers] = quorum.members;
            const entry = createQuorumPendingApproval({
                quorum,
                pending: pendingMembers,
                submitted: [submittedMember],
            });
            entry.quorumApprovals[list][0].member.locator = "device:public-key";

            expect(() => toQuorumProgress(entry)).toThrow("Malformed quorum member locator: device:public-key");
        }
    );
});

describe("awaitsQuorumOnly", () => {
    const quorumNeedingMembers = () => createQuorumPendingApproval({ quorum: createQuorumApiEntry() });
    const satisfiedQuorum = () => createQuorumPendingApproval({ quorum: createQuorumApiEntry(), remaining: 0 });

    it.each([
        {
            when: "only a quorum still needs members",
            status: "awaiting-approval",
            pending: () => [quorumNeedingMembers()],
            expected: true,
        },
        {
            when: "one quorum is satisfied and another still needs members",
            status: "awaiting-approval",
            pending: () => [satisfiedQuorum(), quorumNeedingMembers()],
            expected: true,
        },
        {
            when: "a flat signer is still pending",
            status: "awaiting-approval",
            pending: () => [flatApproval(), quorumNeedingMembers()],
            expected: false,
        },
        {
            when: "every quorum is satisfied",
            status: "awaiting-approval",
            pending: () => [satisfiedQuorum()],
            expected: false,
        },
        {
            when: "the operation is no longer awaiting approval",
            status: "pending",
            pending: () => [quorumNeedingMembers()],
            expected: false,
        },
    ])("returns $expected when $when", ({ status, pending, expected }) => {
        expect(awaitsQuorumOnly({ status, approvals: { pending: pending() } })).toBe(expected);
    });

    it("returns false when the operation has no approvals", () => {
        expect(awaitsQuorumOnly({ status: "awaiting-approval" })).toBe(false);
    });
});

describe("planMemberApprovals", () => {
    it("plans one approval for a held pending member, with that member's message", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const entry = createQuorumPendingApproval({ quorum });
        const [held] = entry.quorumApprovals.pending;

        expect(planMemberApprovals([entry], [held.member.locator], "remaining")).toEqual([
            { quorum: quorum.locator, memberLocator: held.member.locator, message: held.message },
        ]);
    });

    it("plans nothing for a held member that already submitted", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const [submittedMember, ...pendingMembers] = quorum.members;
        const entry = createQuorumPendingApproval({ quorum, pending: pendingMembers, submitted: [submittedMember] });

        expect(planMemberApprovals([entry], [submittedMember.locator], "remaining")).toEqual([]);
    });

    it.each(["remaining", "all"] as const)(
        "plans nothing for a quorum with no remaining approvals (limit %s)",
        (limit) => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
            const entry = createQuorumPendingApproval({ quorum, remaining: 0 });

            expect(planMemberApprovals([entry], [quorum.members[0].locator], limit)).toEqual([]);
        }
    );

    it("plans a held key once per quorum when it is listed twice", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const entry = createQuorumPendingApproval({ quorum });
        const heldLocator = quorum.members[0].locator;

        expect(planMemberApprovals([entry], [heldLocator, heldLocator], "remaining")).toHaveLength(1);
    });

    it("plans one approval per quorum, each with that quorum's message, for a key in two quorums", () => {
        const first = createQuorumApiEntry();
        const second = createQuorumApiEntry();
        const shared = first.members[0];
        second.members[0] = shared;
        const firstEntry = createQuorumPendingApproval({ quorum: first });
        const secondEntry = createQuorumPendingApproval({ quorum: second });

        expect(planMemberApprovals([firstEntry, secondEntry], [shared.locator], "remaining")).toEqual([
            {
                quorum: first.locator,
                memberLocator: shared.locator,
                message: firstEntry.quorumApprovals.pending[0].message,
            },
            {
                quorum: second.locator,
                memberLocator: shared.locator,
                message: secondEntry.quorumApprovals.pending[0].message,
            },
        ]);
    });

    describe("when more members are held than the quorum still needs", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const entry = createQuorumPendingApproval({ quorum });
        const allLocators = quorum.members.map((member) => member.locator);
        const plannedLocators = (limit: "remaining" | "all") =>
            planMemberApprovals([entry], [...allLocators].reverse(), limit).map((planned) => planned.memberLocator);

        it("takes the first `remaining` held members in pending order with limit remaining", () => {
            expect(plannedLocators("remaining")).toEqual(allLocators.slice(0, 2));
        });

        it("takes every held pending member with limit all", () => {
            expect(plannedLocators("all")).toEqual(allLocators);
        });
    });

    describe("when a pending member's locator is malformed", () => {
        it("skips it when this client does not hold it", () => {
            const quorum = createQuorumApiEntry();
            const entry = createQuorumPendingApproval({ quorum });
            entry.quorumApprovals.pending[1].member.locator = "api-key";
            const held = entry.quorumApprovals.pending[0];

            expect(planMemberApprovals([entry], [held.member.locator], "remaining")).toEqual([
                { quorum: quorum.locator, memberLocator: held.member.locator, message: held.message },
            ]);
        });

        it("throws when this client holds it", () => {
            const entry = createQuorumPendingApproval({ quorum: createQuorumApiEntry() });
            entry.quorumApprovals.pending[1].member.locator = "api-key";

            expect(() => planMemberApprovals([entry], ["api-key"], "remaining")).toThrow(
                "Malformed quorum member locator: api-key"
            );
        });
    });

    describe("when the quorum locator is malformed", () => {
        const malformedEntry = (quorum: ReturnType<typeof createQuorumApiEntry>) => ({
            ...createQuorumPendingApproval({ quorum }),
            signer: { type: "quorum" as const, locator: "3f9c2b8e-5d1a-8c4f-9e2b-7a6d5c4b3a21" },
        });

        it("skips the quorum when this client holds none of its members", () => {
            const entry = malformedEntry(createQuorumApiEntry());

            expect(planMemberApprovals([entry], ["email:outsider@example.com"], "remaining")).toEqual([]);
        });

        it("throws when this client holds one of its members", () => {
            const quorum = createQuorumApiEntry();

            expect(() =>
                planMemberApprovals([malformedEntry(quorum)], [quorum.members[0].locator], "remaining")
            ).toThrow("Malformed quorum locator: 3f9c2b8e-5d1a-8c4f-9e2b-7a6d5c4b3a21");
        });
    });

    it("plans a held EVM external wallet the API lists in another case, with the API's locator", () => {
        const quorum = createQuorumApiEntry();
        const apiLocator = "external-wallet:0xabcdef0123456789abcdef0123456789abcdef01";
        quorum.members[0] = { type: "external-wallet", address: apiLocator.slice(16), locator: apiLocator };
        const entry = createQuorumPendingApproval({ quorum });

        expect(
            planMemberApprovals([entry], ["external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01"], "remaining")
        ).toEqual([
            { quorum: quorum.locator, memberLocator: apiLocator, message: entry.quorumApprovals.pending[0].message },
        ]);
    });
});
