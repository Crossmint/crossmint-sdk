import { describe, expect, it } from "vitest";
import type { SignerLocator } from "../signers/types";
import { QuorumSelectionAmbiguousError } from "../utils/errors";
import { createQuorumApiEntry } from "../wallets/__tests__/test-helpers";
import { type HeldKey, resolveSignerChangeRole, resolveTransactionRole, type TransactionHeldKey } from "./roles";

const HELD: SignerLocator = "email:held@example.com";
const SINGLE_SIGNER: SignerLocator = "external-wallet:0x1234567890123456789012345678901234567890";

// A quorum that lists the held key as its first member.
const quorumWithHeldMember = () => {
    const quorum = createQuorumApiEntry();
    quorum.members[0] = { type: "email", email: "held@example.com", address: "0xheld", locator: HELD };
    return quorum;
};

const transactionKey = (overrides: Partial<TransactionHeldKey> = {}): TransactionHeldKey => ({
    held: HELD,
    recoveryMethodLocators: [],
    recoveryQuorums: [],
    delegatedQuorums: [],
    registeredOnChain: false,
    ...overrides,
});

const signerChangeKey = (overrides: Partial<HeldKey> = {}): HeldKey => ({
    held: HELD,
    recoveryMethodLocators: [],
    recoveryQuorums: [],
    ...overrides,
});

describe("acting role", () => {
    describe.each([
        {
            scope: "transaction",
            resolve: (overrides: Partial<HeldKey>) => resolveTransactionRole(transactionKey(overrides)),
        },
        {
            scope: "signer-change",
            resolve: (overrides: Partial<HeldKey>) => resolveSignerChangeRole(signerChangeKey(overrides)),
        },
    ])("for $scope", ({ resolve }) => {
        describe("when the call passes an explicit signer", () => {
            it("acts as an explicit quorum as given, without checking membership", () => {
                const unrelated = createQuorumApiEntry();

                expect(resolve({ explicitSigner: unrelated.locator })).toEqual({
                    kind: "quorum",
                    locator: unrelated.locator,
                });
            });

            it("rejects an explicit quorum locator with a malformed id", () => {
                expect(() => resolve({ explicitSigner: "quorum:garbage" })).toThrow(
                    /Malformed quorum locator: quorum:garbage/
                );
            });

            it("acts as an explicit single signer as given", () => {
                const role = resolve({ explicitSigner: SINGLE_SIGNER, recoveryQuorums: [quorumWithHeldMember()] });

                expect(role).toEqual({ kind: "self", locator: SINGLE_SIGNER });
            });
        });

        describe("when the key is a recovery method that signs alone", () => {
            it("acts as itself, even though it is also a quorum member", () => {
                const role = resolve({ recoveryMethodLocators: [HELD], recoveryQuorums: [quorumWithHeldMember()] });

                expect(role).toEqual({ kind: "self", locator: HELD });
            });

            it("acts as the stored recovery locator when an EVM address differs only in case", () => {
                const stored: SignerLocator = "external-wallet:0xabcdef0123456789abcdef0123456789abcdef01";
                const held: SignerLocator = "external-wallet:0xAbCdEf0123456789aBcDeF0123456789AbCdEf01";

                expect(resolve({ held, recoveryMethodLocators: [stored] })).toEqual({
                    kind: "self",
                    locator: stored,
                });
            });
        });

        describe("when the key is a member of one recovery quorum only", () => {
            it("acts as that quorum", () => {
                const quorum = quorumWithHeldMember();

                expect(resolve({ recoveryQuorums: [quorum] })).toEqual({
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
                    resolve({ recoveryQuorums: [first, second] });
                    expect.fail("Expected the role to throw");
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
                const role = resolveTransactionRole(
                    transactionKey({ delegatedQuorums: [quorumWithHeldMember()], registeredOnChain: true })
                );

                expect(role).toEqual({ kind: "self", locator: HELD });
            });
        });

        describe("when the key is a member of one delegated quorum only", () => {
            it("acts as that quorum", () => {
                const quorum = quorumWithHeldMember();

                expect(resolveTransactionRole(transactionKey({ delegatedQuorums: [quorum] }))).toEqual({
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
                    resolveTransactionRole(
                        transactionKey({ recoveryQuorums: [recoveryQuorum], delegatedQuorums: [delegatedQuorum] })
                    );
                    expect.fail("Expected the role to throw");
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
                const role = resolveTransactionRole(
                    transactionKey({
                        recoveryQuorums: [createQuorumApiEntry()],
                        delegatedQuorums: [createQuorumApiEntry()],
                    })
                );

                expect(role).toEqual({ kind: "self", locator: HELD });
            });
        });
    });

    describe("for signer-change", () => {
        // Delegated fields are not part of a signer-change key; extra fields must not change the result.
        const withDelegatedFields = (delegatedQuorum: ReturnType<typeof quorumWithHeldMember>) => ({
            delegatedQuorums: [delegatedQuorum],
            registeredOnChain: true,
        });

        describe("when the key is a registered delegated signer and a member of a recovery quorum", () => {
            it("acts as the recovery quorum", () => {
                const recoveryQuorum = quorumWithHeldMember();
                const input = {
                    ...signerChangeKey({ recoveryQuorums: [recoveryQuorum] }),
                    ...withDelegatedFields(createQuorumApiEntry()),
                };

                expect(resolveSignerChangeRole(input)).toEqual({ kind: "quorum", locator: recoveryQuorum.locator });
            });
        });

        describe("when the key is a member of a recovery quorum and a delegated quorum", () => {
            it("acts as the recovery quorum without searching delegated quorums", () => {
                const recoveryQuorum = quorumWithHeldMember();
                const input = {
                    ...signerChangeKey({ recoveryQuorums: [recoveryQuorum] }),
                    ...withDelegatedFields(quorumWithHeldMember()),
                };

                expect(resolveSignerChangeRole(input)).toEqual({ kind: "quorum", locator: recoveryQuorum.locator });
            });
        });

        describe("when the key is not a recovery method and not in a recovery quorum", () => {
            it("returns none", () => {
                const role = resolveSignerChangeRole(
                    signerChangeKey({
                        recoveryMethodLocators: ["email:recovery@example.com"],
                        recoveryQuorums: [createQuorumApiEntry()],
                    })
                );

                expect(role).toEqual({ kind: "none" });
            });
        });
    });
});
