import { describe, expect, it } from "vitest";
import { paymentMethodManagementIncomingEvents } from "./incoming";

const resultSchema = paymentMethodManagementIncomingEvents["payment-method:result"];

const CARD = {
    type: "card",
    paymentMethodId: "pm_1",
    card: {
        source: { type: "basis-theory-token", id: "bt_1" },
        brand: "visa",
        last4: "4242",
        expiration: { month: "08", year: "2030" },
    },
};

describe("payment-method:result schema", () => {
    it("keeps known statuses, including the payment method on selected and saved", () => {
        for (const status of ["selected", "saved"] as const) {
            const parsed = resultSchema.parse({ requestId: "r1", result: { status, paymentMethod: CARD } });
            expect(parsed.result).toEqual({ status, paymentMethod: CARD });
        }
        expect(
            resultSchema.parse({ requestId: "r1", result: { status: "invalid", message: "Check the card" } }).result
        ).toEqual({ status: "invalid", message: "Check the card" });
    });

    it("rejects an empty requestId", () => {
        expect(
            resultSchema.safeParse({ requestId: "", result: { status: "saved", paymentMethod: CARD } }).success
        ).toBe(false);
    });

    it("maps an unknown status to failed and keeps its message", () => {
        const parsed = resultSchema.parse({ requestId: "r1", result: { status: "requires_action", message: "x" } });
        expect(parsed.result).toEqual({ status: "failed", message: "x" });
    });

    it("maps an unknown status without a message to failed with a default message", () => {
        const parsed = resultSchema.parse({ requestId: "r1", result: { status: "requires_action" } });
        expect(parsed.result).toEqual({
            status: "failed",
            message: "The payment method component returned an unexpected result. Please try again.",
        });
    });

    it("maps a saved result without a payment method to failed", () => {
        const parsed = resultSchema.parse({ requestId: "r1", result: { status: "saved" } });
        expect(parsed.result).toEqual({
            status: "failed",
            message: "The payment method component returned an unexpected result. Please try again.",
        });
    });

    it("rejects a payment method without type or paymentMethodId", () => {
        const parsed = resultSchema.parse({ requestId: "r1", result: { status: "selected", paymentMethod: {} } });
        expect(parsed.result.status).toBe("failed");
    });
});
