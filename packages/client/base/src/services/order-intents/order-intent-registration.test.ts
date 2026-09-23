import { describe, expect, test } from "vitest";

import { needsOrderIntentRegistration } from "./orderIntentRegistration";

describe("needsOrderIntentRegistration", () => {
    describe("when the card has no registration yet", () => {
        test("registers", () => {
            expect(needsOrderIntentRegistration(null)).toBe(true);
        });

        test("registers when the registration lists no rails", () => {
            expect(needsOrderIntentRegistration({ paymentMethodId: "pm_1", rails: [] })).toBe(true);
        });
    });

    describe("when an agentic-token rail is already enabled", () => {
        test("skips registration for vic", () => {
            expect(
                needsOrderIntentRegistration({
                    paymentMethodId: "pm_1",
                    rails: [
                        { rail: "agentic-token", provider: "vic", status: "enabled" },
                        { rail: "spt", provider: "stripe", status: "error", error: { code: "declined" } },
                    ],
                })
            ).toBe(false);
        });

        test("skips registration when only agentpay is enabled", () => {
            expect(
                needsOrderIntentRegistration({
                    paymentMethodId: "pm_1",
                    rails: [{ rail: "agentic-token", provider: "agentpay", status: "enabled" }],
                })
            ).toBe(false);
        });
    });

    describe("when only spt is enabled", () => {
        test("registers, since no agentic-token enrollment was attempted", () => {
            expect(
                needsOrderIntentRegistration({
                    paymentMethodId: "pm_1",
                    rails: [{ rail: "spt", provider: "stripe", status: "enabled" }],
                })
            ).toBe(true);
        });
    });

    describe("when the agentic-token rails are pending or in error", () => {
        test("does not register again while the server is still enrolling", () => {
            expect(
                needsOrderIntentRegistration({
                    paymentMethodId: "pm_1",
                    rails: [{ rail: "agentic-token", provider: "vic", status: "pending" }],
                })
            ).toBe(false);
        });

        test("does not register again for a card no provider accepts, so encrypted-card still gets its turn", () => {
            expect(
                needsOrderIntentRegistration({
                    paymentMethodId: "pm_1",
                    rails: [
                        { rail: "agentic-token", provider: "vic", status: "error", error: { code: "not_eligible" } },
                        {
                            rail: "agentic-token",
                            provider: "agentpay",
                            status: "error",
                            error: { code: "not_eligible" },
                        },
                    ],
                })
            ).toBe(false);
        });
    });
});
