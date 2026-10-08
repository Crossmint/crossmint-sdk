import { describe, expect, test } from "vitest";

import type { CrossmintCardPaymentMethod } from "@/types/payment-method-management/CrossmintPaymentMethodManagementProps";
import { toAgentCardPaymentMethodSummary } from "./cardPaymentMethodSelection";

const CARD: CrossmintCardPaymentMethod = {
    type: "card",
    paymentMethodId: "pm_1",
    card: {
        source: { type: "basis-theory-token", id: "bt_token_secret" },
        brand: "visa",
        last4: "4242",
        expiration: { month: "12", year: "2030" },
    },
    default: true,
    display: { imageUrl: "https://cdn.example.com/visa.png" },
};

describe("toAgentCardPaymentMethodSummary", () => {
    describe("when the payment-method UI reports a card", () => {
        test("keeps only id, type, brand and last4", () => {
            expect(toAgentCardPaymentMethodSummary(CARD)).toEqual({
                id: "pm_1",
                type: "card",
                brand: "visa",
                last4: "4242",
            });
        });

        test("strips card.source, so the vault token id never leaves the component", () => {
            const summary = toAgentCardPaymentMethodSummary(CARD);

            expect(JSON.stringify(summary)).not.toContain("bt_token_secret");
            expect(JSON.stringify(summary)).not.toContain("source");
            expect(Object.keys(summary ?? {})).toEqual(["id", "type", "brand", "last4"]);
        });
    });

    describe("when the payment-method UI reports something else", () => {
        test("rejects a bank account", () => {
            expect(
                toAgentCardPaymentMethodSummary({
                    type: "bank-account-us",
                    paymentMethodId: "pm_2",
                    bankAccount: { accountSuffix: "6789", bankName: "Example Bank", accountType: "checking" },
                })
            ).toBeNull();
        });

        test("rejects malformed display fields, such as an empty brand or a non-numeric last4", () => {
            expect(toAgentCardPaymentMethodSummary({ ...CARD, card: { ...CARD.card, brand: "" } })).toBeNull();
            expect(toAgentCardPaymentMethodSummary({ ...CARD, card: { ...CARD.card, last4: "x" } })).toBeNull();
            expect(toAgentCardPaymentMethodSummary({ ...CARD, card: { ...CARD.card, last4: "42424" } })).toBeNull();
        });

        test("rejects a card payload missing its display fields", () => {
            expect(toAgentCardPaymentMethodSummary({ type: "card", paymentMethodId: "pm_1", card: {} })).toBeNull();
        });

        test("rejects non-objects", () => {
            expect(toAgentCardPaymentMethodSummary(undefined)).toBeNull();
            expect(toAgentCardPaymentMethodSummary("pm_1")).toBeNull();
        });
    });
});
