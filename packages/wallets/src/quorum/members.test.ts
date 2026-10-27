import { describe, expect, it } from "vitest";
import { isQuorumMemberLocator } from "../signers/types";
import { createQuorumApiEntry } from "../wallets/__tests__/test-helpers";
import { quorumsWithComposition, quorumsWithMember } from "./members";

const memberLocators = (quorum: ReturnType<typeof createQuorumApiEntry>) =>
    quorum.members.map((member) => member.locator);

describe("quorumsWithMember", () => {
    it("returns every quorum that lists the locator as a member", () => {
        const first = createQuorumApiEntry();
        const second = createQuorumApiEntry();
        const shared = first.members[0];
        second.members[1] = shared;

        expect(quorumsWithMember([first, second], shared.locator)).toEqual([first, second]);
    });

    it("returns no quorum when the locator is not a member", () => {
        const quorum = createQuorumApiEntry();

        expect(quorumsWithMember([quorum], "email:outsider@example.com")).toEqual([]);
    });

    it("compares locators exactly, so a member with different case does not match", () => {
        const quorum = createQuorumApiEntry();
        const member = quorum.members[0];
        member.locator = "email:member@example.com";

        expect(quorumsWithMember([quorum], "email:MEMBER@example.com")).toEqual([]);
    });
});

describe("quorumsWithComposition", () => {
    it("matches a quorum with the same threshold and member set in another order", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const reversed = memberLocators(quorum).reverse();

        expect(quorumsWithComposition([quorum], 2, reversed)).toEqual([quorum]);
    });

    it("does not match a quorum with the same members and another threshold", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });

        expect(quorumsWithComposition([quorum], 3, memberLocators(quorum))).toEqual([]);
    });

    it("does not match when the requested members are a subset or a superset", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const locators = memberLocators(quorum);

        expect(quorumsWithComposition([quorum], 2, locators.slice(0, 2))).toEqual([]);
        expect(quorumsWithComposition([quorum], 2, [...locators, "email:extra@example.com"])).toEqual([]);
    });

    it("never matches when the requested members repeat a locator", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
        const [first, second] = memberLocators(quorum);

        expect(quorumsWithComposition([quorum], 2, [first, second, first])).toEqual([]);
    });

    it("returns both quorums when two have the same composition", () => {
        const first = createQuorumApiEntry({ threshold: 2, memberCount: 2 });
        const second = { ...first, locator: createQuorumApiEntry().locator };

        expect(quorumsWithComposition([first, second], 2, memberLocators(first))).toEqual([first, second]);
    });
});

describe("isQuorumMemberLocator", () => {
    it.each([
        "email:member@example.com",
        "phone:+15555550100",
        "external-wallet:0x1234567890123456789012345678901234567890",
        "server:0x1234567890123456789012345678901234567890",
        "passkey:credential-id",
    ])("accepts %s", (locator) => {
        expect(isQuorumMemberLocator(locator)).toBe(true);
    });

    it.each(["api-key", "api-key:0x1234", "device:public-key", "quorum:3f9c2b8e-5d1a-8c4f-9e2b-7a6d5c4b3a21", "email"])(
        "rejects %s",
        (locator) => {
            expect(isQuorumMemberLocator(locator)).toBe(false);
        }
    );
});
