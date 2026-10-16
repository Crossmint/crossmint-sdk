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
const FALLBACK_MESSAGE = "The payment method component returned an unexpected result. Please try again.";

describe("payment-method:result schema", () => {
    it("keeps known statuses and rejects an empty requestId", () => {
        for (const status of ["selected", "saved"] as const) {
            const parsed = resultSchema.parse({ requestId: "r1", result: { status, paymentMethod: CARD } });
            expect(parsed.result).toEqual({ status, paymentMethod: CARD });
        }
        expect(
            resultSchema.parse({ requestId: "r1", result: { status: "invalid", message: "Check the card" } }).result
        ).toEqual({ status: "invalid", message: "Check the card" });
        expect(
            resultSchema.safeParse({ requestId: "", result: { status: "saved", paymentMethod: CARD } }).success
        ).toBe(false);
    });

    it.each([
        [
            { status: "requires_action", message: "x" },
            { status: "failed", message: "x" },
        ],
        [{ status: "requires_action" }, { status: "failed", message: FALLBACK_MESSAGE }],
        [{ status: "saved" }, { status: "failed", message: FALLBACK_MESSAGE }],
        [
            { status: "selected", paymentMethod: {} },
            { status: "failed", message: FALLBACK_MESSAGE },
        ],
    ])("maps %j to %j instead of dropping it", (result, expected) => {
        expect(resultSchema.parse({ requestId: "r1", result }).result).toEqual(expected);
    });
});
