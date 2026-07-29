import { describe, expect, it, vi } from "vitest";
import type { ResolvedQuorumMember } from "../signers/types";
import { getQuorumMemberLocator, matchesQuorumMember } from "./quorum-members";

const NO_SERVER_ADDRESSES = () => [] as string[];

describe("getQuorumMemberLocator", () => {
    it.each([
        [
            "an API-sourced locator",
            { type: "email", email: "other@x.com", locator: "email:alice@gmail.com" },
            "email:alice@gmail.com",
        ],
        ["a server address fallback", { type: "server", address: "0xServer" }, "server:0xServer"],
        [
            "an email fallback with normalization",
            { type: "email", email: "A.l.i.c.e@GMAIL.com" },
            "email:alice@gmail.com",
        ],
        ["an external-wallet fallback", { type: "external-wallet", address: "0xExt" }, "external-wallet:0xExt"],
    ])("uses %s", (_name, member, expected) => {
        expect(getQuorumMemberLocator(member as ResolvedQuorumMember)).toBe(expected);
    });
});

describe("matchesQuorumMember", () => {
    it("rejects a candidate of a different type", () => {
        expect(
            matchesQuorumMember(
                { type: "email", email: "alice@gmail.com" },
                { type: "phone", phone: "+15551234567" },
                NO_SERVER_ADDRESSES
            )
        ).toBe(false);
    });

    describe("when the member is an email", () => {
        const member: ResolvedQuorumMember = { type: "email", email: "alice@gmail.com" };

        it.each([
            ["an exact address", "alice@gmail.com", true],
            ["a denormalized Gmail address", "A.l.i.c.e@GMAIL.com", true],
            ["a different address", "mallory@gmail.com", false],
        ])("compares normalized emails: %s", (_name, email, expected) => {
            expect(matchesQuorumMember({ type: "email", email }, member, NO_SERVER_ADDRESSES)).toBe(expected);
        });
    });

    describe("when the member is a phone number", () => {
        it.each([
            ["the same number", "+15551234567", true],
            ["a different number", "+15550000000", false],
        ])("compares exactly: %s", (_name, phone, expected) => {
            expect(
                matchesQuorumMember(
                    { type: "phone", phone },
                    { type: "phone", phone: "+15551234567" },
                    NO_SERVER_ADDRESSES
                )
            ).toBe(expected);
        });
    });

    describe("when the member is an external wallet", () => {
        it.each([
            ["the same address", "0xAbC", true],
            ["a different address", "0xDef", false],
        ])("compares addresses exactly: %s", (_name, address, expected) => {
            expect(
                matchesQuorumMember(
                    { type: "external-wallet", address },
                    { type: "external-wallet", address: "0xAbC" },
                    NO_SERVER_ADDRESSES
                )
            ).toBe(expected);
        });
    });

    describe("when the member is a passkey", () => {
        const member: ResolvedQuorumMember = { type: "passkey", id: "pk-1", name: "primary" };

        it.each([
            ["a matching id", { id: "pk-1" }, true],
            ["a mismatching id even when the name matches", { id: "pk-9", name: "primary" }, false],
            ["a matching name when no id is given", { name: "primary" }, true],
            ["a mismatching name", { name: "backup" }, false],
            ["no id and no name (permissive)", {}, true],
        ])("matches by id, then name, then permissively: %s", (_name, fields, expected) => {
            expect(matchesQuorumMember({ type: "passkey", ...fields }, member, NO_SERVER_ADDRESSES)).toBe(expected);
        });
    });

    describe("when the member is a server signer", () => {
        const member: ResolvedQuorumMember = { type: "server", address: "0xDerived" };

        it("matches when any derivable candidate address equals the member address", () => {
            const candidates = vi.fn(() => ["0xPrimary", "0xDerived"]);
            expect(matchesQuorumMember({ type: "server", secret: "s3cret" }, member, candidates)).toBe(true);
            expect(candidates).toHaveBeenCalledWith({ type: "server", secret: "s3cret" });
        });

        it("rejects when no derivable candidate address matches", () => {
            expect(matchesQuorumMember({ type: "server", secret: "s3cret" }, member, () => ["0xOther"])).toBe(false);
        });

        it("rejects a member without an API address", () => {
            expect(
                matchesQuorumMember({ type: "server", secret: "s3cret" }, { type: "server" }, () => ["0xDerived"])
            ).toBe(false);
        });

        it("rejects a candidate without a secret", () => {
            const candidates = vi.fn(() => ["0xDerived"]);
            expect(matchesQuorumMember({ type: "server", address: "0xDerived" }, member, candidates)).toBe(false);
            expect(candidates).not.toHaveBeenCalled();
        });
    });
});
