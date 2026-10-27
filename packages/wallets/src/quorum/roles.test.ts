import { describe, expect, it } from "vitest";
import type { SignerLocator } from "../signers/types";
import { QuorumSelectionAmbiguousError } from "../utils/errors";
import { createQuorumApiEntry } from "../wallets/__tests__/test-helpers";
import { resolveActingRole } from "./roles";

const HELD: SignerLocator = "email:held@example.com";

// A quorum that lists the held key as its first member.
const quorumWithHeldMember = () => {
    const quorum = createQuorumApiEntry();
    quorum.members[0] = { type: "email", email: "held@example.com", address: "0xheld", locator: HELD };
    return quorum;
};

describe("resolveActingRole", () => {
    describe("with an explicit signer", () => {
        it.each(["transaction", "signer-change"] as const)(
            "uses an explicit quorum locator as given, without checking membership (%s)",
            (scope) => {
                const unrelated = createQuorumApiEntry();
                const base = {
                    heldLocator: HELD,
                    explicit: unrelated.locator,
                    recoveryLocators: [],
                    recoveryQuorums: [],
                };
                const input =
                    scope === "transaction"
                        ? { ...base, scope, delegatedQuorums: [], isRegisteredSigner: false }
                        : { ...base, scope };

                expect(resolveActingRole(input)).toEqual({ kind: "quorum", locator: unrelated.locator });
            }
        );

        it("uses an explicit single-signer locator as given", () => {
            const explicit: SignerLocator = "external-wallet:0x1234567890123456789012345678901234567890";

            expect(
                resolveActingRole({
                    scope: "transaction",
                    heldLocator: HELD,
                    explicit,
                    recoveryLocators: [],
                    recoveryQuorums: [quorumWithHeldMember()],
                    delegatedQuorums: [],
                    isRegisteredSigner: false,
                })
            ).toEqual({ kind: "self", locator: explicit });
        });
    });

    describe("for transactions", () => {
        it("acts as itself when the key is a recovery method, even if it is also a quorum member", () => {
            expect(
                resolveActingRole({
                    scope: "transaction",
                    heldLocator: HELD,
                    recoveryLocators: [HELD],
                    recoveryQuorums: [quorumWithHeldMember()],
                    delegatedQuorums: [],
                    isRegisteredSigner: false,
                })
            ).toEqual({ kind: "self", locator: HELD });
        });

        it("acts as itself when the key is a registered delegated signer, even if it is also a quorum member", () => {
            expect(
                resolveActingRole({
                    scope: "transaction",
                    heldLocator: HELD,
                    recoveryLocators: [],
                    recoveryQuorums: [],
                    delegatedQuorums: [quorumWithHeldMember()],
                    isRegisteredSigner: true,
                })
            ).toEqual({ kind: "self", locator: HELD });
        });

        it.each([
            { quorumKind: "recovery", recovery: true },
            { quorumKind: "delegated", recovery: false },
        ])("acts as the one $quorumKind quorum the key is a member of", ({ recovery }) => {
            const quorum = quorumWithHeldMember();

            expect(
                resolveActingRole({
                    scope: "transaction",
                    heldLocator: HELD,
                    recoveryLocators: [],
                    recoveryQuorums: recovery ? [quorum] : [],
                    delegatedQuorums: recovery ? [] : [quorum],
                    isRegisteredSigner: false,
                })
            ).toEqual({ kind: "quorum", locator: quorum.locator });
        });

        it("throws QuorumSelectionAmbiguousError with both locators for a member of a recovery and a delegated quorum", () => {
            const recoveryQuorum = quorumWithHeldMember();
            const delegatedQuorum = quorumWithHeldMember();

            try {
                resolveActingRole({
                    scope: "transaction",
                    heldLocator: HELD,
                    recoveryLocators: [],
                    recoveryQuorums: [recoveryQuorum],
                    delegatedQuorums: [delegatedQuorum],
                    isRegisteredSigner: false,
                });
                expect.fail("Expected resolveActingRole to throw");
            } catch (error) {
                expect(error).toBeInstanceOf(QuorumSelectionAmbiguousError);
                expect((error as QuorumSelectionAmbiguousError).quorumLocators).toEqual([
                    recoveryQuorum.locator,
                    delegatedQuorum.locator,
                ]);
            }
        });

        it("acts as itself when the key is neither a signer nor a member (the API rejects it)", () => {
            expect(
                resolveActingRole({
                    scope: "transaction",
                    heldLocator: HELD,
                    recoveryLocators: [],
                    recoveryQuorums: [createQuorumApiEntry()],
                    delegatedQuorums: [createQuorumApiEntry()],
                    isRegisteredSigner: false,
                })
            ).toEqual({ kind: "self", locator: HELD });
        });
    });

    describe("for signer changes", () => {
        it("acts as itself when the key is a recovery method, even if it is also a quorum member", () => {
            expect(
                resolveActingRole({
                    scope: "signer-change",
                    heldLocator: HELD,
                    recoveryLocators: [HELD],
                    recoveryQuorums: [quorumWithHeldMember()],
                })
            ).toEqual({ kind: "self", locator: HELD });
        });

        // Delegated signers and delegated quorums are not inputs for signer changes, so neither can change this.
        it("acts as the one recovery quorum the key is a member of", () => {
            const quorum = quorumWithHeldMember();

            expect(
                resolveActingRole({
                    scope: "signer-change",
                    heldLocator: HELD,
                    recoveryLocators: [],
                    recoveryQuorums: [quorum],
                })
            ).toEqual({ kind: "quorum", locator: quorum.locator });
        });

        it("throws QuorumSelectionAmbiguousError for a member of two recovery quorums", () => {
            const first = quorumWithHeldMember();
            const second = quorumWithHeldMember();

            expect(() =>
                resolveActingRole({
                    scope: "signer-change",
                    heldLocator: HELD,
                    recoveryLocators: [],
                    recoveryQuorums: [first, second],
                })
            ).toThrow(QuorumSelectionAmbiguousError);
        });

        it("returns none when the key is not a recovery method and not in a recovery quorum", () => {
            expect(
                resolveActingRole({
                    scope: "signer-change",
                    heldLocator: HELD,
                    recoveryLocators: ["email:recovery@example.com"],
                    recoveryQuorums: [createQuorumApiEntry()],
                })
            ).toEqual({ kind: "none" });
        });
    });
});
