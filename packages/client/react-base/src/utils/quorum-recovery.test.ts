import type { Chain, WalletCreateArgs } from "@crossmint/wallets-sdk";
import { describe, expect, test } from "vitest";

import { fillRecoveryEmail, recoveryNeedsEmailAutoFill, recoverySigners } from "./quorum-recovery";

type RecoveryConfig = WalletCreateArgs<Chain>["recovery"];

const USER_EMAIL = "user@example.com";

describe("recoverySigners", () => {
    describe("when the recovery is undefined", () => {
        test("returns no signers", () => {
            expect(recoverySigners(undefined)).toEqual([]);
        });
    });

    describe("when the recovery is a flat signer", () => {
        test("returns the signer itself", () => {
            const recovery: RecoveryConfig = { type: "email", email: USER_EMAIL };
            expect(recoverySigners(recovery)).toEqual([recovery]);
        });
    });

    describe("when the recovery is a quorum", () => {
        test("returns the member signers", () => {
            const recovery: RecoveryConfig = {
                type: "quorum",
                methods: [
                    { type: "email", email: USER_EMAIL },
                    { type: "phone", phone: "+15555550100" },
                ],
            };
            expect(recoverySigners(recovery)).toEqual(recovery.type === "quorum" ? recovery.methods : []);
        });

        test("surfaces email, phone and passkey members to per-signer checks", () => {
            const recovery: RecoveryConfig = {
                type: "quorum",
                methods: [
                    { type: "passkey", name: "my-key" },
                    { type: "external-wallet", address: "0xabc", onSign: (payload: string) => Promise.resolve(payload) },
                ],
            };
            const signers = recoverySigners(recovery);
            expect(signers.some((s) => s.type === "passkey")).toBe(true);
            expect(signers.some((s) => s.type === "email" || s.type === "phone")).toBe(false);
        });
    });
});

describe("recoveryNeedsEmailAutoFill", () => {
    describe("when the recovery is a flat email signer without an email", () => {
        test("requests auto-fill", () => {
            expect(recoveryNeedsEmailAutoFill({ type: "email" })).toBe(true);
        });
    });

    describe("when the recovery is a flat email signer with an email", () => {
        test("does not request auto-fill", () => {
            expect(recoveryNeedsEmailAutoFill({ type: "email", email: USER_EMAIL })).toBe(false);
        });
    });

    describe("when the recovery is a flat non-email signer", () => {
        test("does not request auto-fill", () => {
            expect(recoveryNeedsEmailAutoFill({ type: "passkey" })).toBe(false);
            expect(recoveryNeedsEmailAutoFill(undefined)).toBe(false);
        });
    });

    describe("when a quorum has exactly one email member missing its email", () => {
        test("requests auto-fill", () => {
            expect(
                recoveryNeedsEmailAutoFill({
                    type: "quorum",
                    methods: [{ type: "email" }, { type: "phone", phone: "+15555550100" }],
                })
            ).toBe(true);
        });
    });

    describe("when a quorum has two email members missing their email", () => {
        test("does not request auto-fill, leaving the config for validation", () => {
            expect(
                recoveryNeedsEmailAutoFill({
                    type: "quorum",
                    methods: [{ type: "email" }, { type: "email" }],
                })
            ).toBe(false);
        });
    });

    describe("when a quorum's email members all carry an email", () => {
        test("does not request auto-fill", () => {
            expect(
                recoveryNeedsEmailAutoFill({
                    type: "quorum",
                    methods: [
                        { type: "email", email: USER_EMAIL },
                        { type: "phone", phone: "+15555550100" },
                    ],
                })
            ).toBe(false);
        });
    });
});

describe("fillRecoveryEmail", () => {
    describe("when the recovery is a flat email signer without an email", () => {
        test("fills the email without mutating the input", () => {
            const recovery: RecoveryConfig = { type: "email" };
            const filled = fillRecoveryEmail(recovery, USER_EMAIL);
            expect(filled).toEqual({ type: "email", email: USER_EMAIL });
            expect(recovery).toEqual({ type: "email" });
        });
    });

    describe("when a quorum has exactly one email member missing its email", () => {
        test("fills only that member without mutating the input", () => {
            const recovery: RecoveryConfig = {
                type: "quorum",
                threshold: 1,
                methods: [
                    { type: "email" },
                    { type: "email", email: "cosigner@example.com" },
                    { type: "phone", phone: "+15555550100" },
                ],
            };
            const filled = fillRecoveryEmail(recovery, USER_EMAIL);
            expect(filled).toEqual({
                type: "quorum",
                threshold: 1,
                methods: [
                    { type: "email", email: USER_EMAIL },
                    { type: "email", email: "cosigner@example.com" },
                    { type: "phone", phone: "+15555550100" },
                ],
            });
            expect(recovery.type === "quorum" && recovery.methods[0]).toEqual({ type: "email" });
        });
    });

    describe("when a quorum has two email members missing their email", () => {
        test("returns the config untouched so validation surfaces the real problem", () => {
            const recovery: RecoveryConfig = {
                type: "quorum",
                methods: [{ type: "email" }, { type: "email" }],
            };
            expect(fillRecoveryEmail(recovery, USER_EMAIL)).toBe(recovery);
        });
    });

    describe("when nothing needs filling", () => {
        test("returns the same object", () => {
            const recovery: RecoveryConfig = { type: "email", email: USER_EMAIL };
            expect(fillRecoveryEmail(recovery, "other@example.com")).toBe(recovery);
        });
    });
});
