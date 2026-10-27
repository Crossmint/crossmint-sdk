import { describe, expect, it } from "vitest";
import { isQuorumMemberLocator } from "../signers/types";
import { createQuorumApiEntry } from "../wallets/__tests__/test-helpers";
import { isSameSignerLocator, quorumsWithComposition, quorumsWithMember } from "./members";

const memberLocators = (quorum: ReturnType<typeof createQuorumApiEntry>) =>
    quorum.members.map((member) => member.locator);

const EVM_CHECKSUMMED = "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";
const SOLANA_ADDRESS = "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

describe("isSameSignerLocator", () => {
    it("ignores case for EVM external-wallet locators", () => {
        expect(isSameSignerLocator(EVM_CHECKSUMMED, EVM_CHECKSUMMED.toLowerCase())).toBe(true);
    });

    it.each([
        { kind: "Solana external-wallet", locator: SOLANA_ADDRESS },
        { kind: "email", locator: "email:Member@example.com" },
        { kind: "server", locator: "server:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01" },
    ])("compares $kind locators exactly", ({ locator }) => {
        expect(isSameSignerLocator(locator, locator)).toBe(true);
        expect(isSameSignerLocator(locator, locator.toLowerCase())).toBe(false);
    });
});

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

    it("matches an EVM external-wallet member written in another case", () => {
        const quorum = createQuorumApiEntry();
        quorum.members[0] = {
            type: "external-wallet",
            address: EVM_CHECKSUMMED.slice("external-wallet:".length).toLowerCase(),
            locator: EVM_CHECKSUMMED.toLowerCase(),
        };

        expect(quorumsWithMember([quorum], EVM_CHECKSUMMED)).toEqual([quorum]);
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

    describe("when the requested members repeat a locator", () => {
        it("does not match a quorum with as many members as the request", () => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 3 });
            const [first, second] = memberLocators(quorum);

            expect(quorumsWithComposition([quorum], 2, [first, second, first])).toEqual([]);
        });

        it("does not match a quorum whose members are the request without the repeat", () => {
            const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 2 });
            const [first, second] = memberLocators(quorum);

            expect(quorumsWithComposition([quorum], 2, [first, second, first])).toEqual([]);
        });
    });

    it("matches EVM external-wallet members written in another case", () => {
        const quorum = createQuorumApiEntry({ threshold: 2, memberCount: 2 });
        quorum.members[0] = {
            type: "external-wallet",
            address: EVM_CHECKSUMMED.slice("external-wallet:".length).toLowerCase(),
            locator: EVM_CHECKSUMMED.toLowerCase(),
        };

        expect(quorumsWithComposition([quorum], 2, [EVM_CHECKSUMMED, quorum.members[1].locator])).toEqual([quorum]);
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
