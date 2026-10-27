import { describe, expect, it } from "vitest";
import type { SignerLocator } from "../signers/types";
import { QuorumSelectionAmbiguousError } from "../utils/errors";
import { createQuorumApiEntry } from "../wallets/__tests__/test-helpers";
import { resolveActingRole } from "./roles";

const HELD: SignerLocator = "email:held@example.com";
const SINGLE_SIGNER: SignerLocator = "external-wallet:0x1234567890123456789012345678901234567890";

// A quorum that lists the held key as its first member.
const quorumWithHeldMember = () => {
    const quorum = createQuorumApiEntry();
    quorum.members[0] = { type: "email", email: "held@example.com", address: "0xheld", locator: HELD };
    return quorum;
};

const transactionInput = (overrides: Partial<Parameters<typeof resolveActingRole>[0]> = {}) => ({
    scope: "transaction" as const,
    heldLocator: HELD,
    recoveryLocators: [],
    recoveryQuorums: [],
    delegatedQuorums: [],
    isRegisteredSigner: false,
    ...overrides,
});

const signerChangeInput = (overrides: Partial<Parameters<typeof resolveActingRole>[0]> = {}) => ({
    scope: "signer-change" as const,
    heldLocator: HELD,
    recoveryLocators: [],
    recoveryQuorums: [],
    ...overrides,
});

describe("resolveActingRole", () => {
    describe.each([
        { scope: "transaction", input: transactionInput },
        { scope: "signer-change", input: signerChangeInput },
    ])("for $scope", ({ input }) => {
        describe("when the call passes an explicit signer", () => {
            it("acts as an explicit quorum as given, without checking membership", () => {
                const unrelated = createQuorumApiEntry();

                expect(resolveActingRole(input({ explicit: unrelated.locator }))).toEqual({
                    kind: "quorum",
                    locator: unrelated.locator,
                });
            });

            it("acts as an explicit single signer as given", () => {
                const role = resolveActingRole(
                    input({ explicit: SINGLE_SIGNER, recoveryQuorums: [quorumWithHeldMember()] })
                );

                expect(role).toEqual({ kind: "self", locator: SINGLE_SIGNER });
            });
        });

        describe("when the key is a recovery method that signs alone", () => {
            it("acts as itself, even though it is also a quorum member", () => {
                const role = resolveActingRole(
                    input({ recoveryLocators: [HELD], recoveryQuorums: [quorumWithHeldMember()] })
                );

                expect(role).toEqual({ kind: "self", locator: HELD });
            });
        });

        describe("when the key is a member of one recovery quorum only", () => {
            it("acts as that quorum", () => {
                const quorum = quorumWithHeldMember();

                expect(resolveActingRole(input({ recoveryQuorums: [quorum] }))).toEqual({
                    kind: "quorum",
                    locator: quorum.locator,
                });
            });
        });

        describe("when the key is a member of two recovery quorums", () => {
            it("throws QuorumSelectionAmbiguousError with both locators", () => {
                const first = quorumWithHeldMember();
                const second = quorumWithHeldMember();

                try {
                    resolveActingRole(input({ recoveryQuorums: [first, second] }));
                    expect.fail("Expected resolveActingRole to throw");
                } catch (error) {
                    expect(error).toBeInstanceOf(QuorumSelectionAmbiguousError);
                    expect((error as QuorumSelectionAmbiguousError).quorumLocators).toEqual([
                        first.locator,
                        second.locator,
                    ]);
                }
            });
        });
    });

    describe("for transaction", () => {
        describe("when the key is a registered delegated signer", () => {
            it("acts as itself, even though it is also a quorum member", () => {
                const role = resolveActingRole(
                    transactionInput({ delegatedQuorums: [quorumWithHeldMember()], isRegisteredSigner: true })
                );

                expect(role).toEqual({ kind: "self", locator: HELD });
            });
        });

        describe("when the key is a member of one delegated quorum only", () => {
            it("acts as that quorum", () => {
                const quorum = quorumWithHeldMember();

                expect(resolveActingRole(transactionInput({ delegatedQuorums: [quorum] }))).toEqual({
                    kind: "quorum",
                    locator: quorum.locator,
                });
            });
        });

        describe("when the key is a member of a recovery quorum and a delegated quorum", () => {
            it("throws QuorumSelectionAmbiguousError with both locators", () => {
                const recoveryQuorum = quorumWithHeldMember();
                const delegatedQuorum = quorumWithHeldMember();

                try {
                    resolveActingRole(
                        transactionInput({ recoveryQuorums: [recoveryQuorum], delegatedQuorums: [delegatedQuorum] })
                    );
                    expect.fail("Expected resolveActingRole to throw");
                } catch (error) {
                    expect(error).toBeInstanceOf(QuorumSelectionAmbiguousError);
                    expect((error as QuorumSelectionAmbiguousError).quorumLocators).toEqual([
                        recoveryQuorum.locator,
                        delegatedQuorum.locator,
                    ]);
                }
            });
        });

        describe("when the key is neither a signer nor a member", () => {
            it("acts as itself, so the API rejects it as today", () => {
                const role = resolveActingRole(
                    transactionInput({
                        recoveryQuorums: [createQuorumApiEntry()],
                        delegatedQuorums: [createQuorumApiEntry()],
                    })
                );

                expect(role).toEqual({ kind: "self", locator: HELD });
            });
        });
    });

    describe("for signer-change", () => {
        // Delegated fields are not part of the signer-change input; extra fields must not change the result.
        const withDelegatedFields = (delegatedQuorum: ReturnType<typeof quorumWithHeldMember>) => ({
            delegatedQuorums: [delegatedQuorum],
            isRegisteredSigner: true,
        });

        describe("when the key is a registered delegated signer and a member of a recovery quorum", () => {
            it("acts as the recovery quorum", () => {
                const recoveryQuorum = quorumWithHeldMember();
                const input = {
                    ...signerChangeInput({ recoveryQuorums: [recoveryQuorum] }),
                    ...withDelegatedFields(createQuorumApiEntry()),
                };

                expect(resolveActingRole(input)).toEqual({ kind: "quorum", locator: recoveryQuorum.locator });
            });
        });

        describe("when the key is a member of a recovery quorum and a delegated quorum", () => {
            it("acts as the recovery quorum without searching delegated quorums", () => {
                const recoveryQuorum = quorumWithHeldMember();
                const input = {
                    ...signerChangeInput({ recoveryQuorums: [recoveryQuorum] }),
                    ...withDelegatedFields(quorumWithHeldMember()),
                };

                expect(resolveActingRole(input)).toEqual({ kind: "quorum", locator: recoveryQuorum.locator });
            });
        });

        describe("when the key is not a recovery method and not in a recovery quorum", () => {
            it("returns none", () => {
                const role = resolveActingRole(
                    signerChangeInput({
                        recoveryLocators: ["email:recovery@example.com"],
                        recoveryQuorums: [createQuorumApiEntry()],
                    })
                );

                expect(role).toEqual({ kind: "none" });
            });
        });
    });
});
