import { describe, expect, it } from "vitest";
import {
    PAYMENT_METHOD_SUBMIT_FAILED_CODES,
    PAYMENT_METHOD_SUBMIT_INVALID_CODES,
    PAYMENT_METHOD_SUBMIT_UNAVAILABLE_CODES,
} from "../CrossmintPaymentMethodManagementProps";
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
        ).toEqual({ status: "invalid", code: "unknown", message: "Check the card" });
        expect(
            resultSchema.safeParse({ requestId: "", result: { status: "saved", paymentMethod: CARD } }).success
        ).toBe(false);
    });

    it.each([
        [
            { status: "requires_action", message: "x" },
            { status: "failed", code: "unknown", message: "x" },
        ],
        [{ status: "requires_action" }, { status: "failed", code: "unknown", message: FALLBACK_MESSAGE }],
        [{ status: "saved" }, { status: "failed", code: "unknown", message: FALLBACK_MESSAGE }],
        [
            { status: "selected", paymentMethod: {} },
            { status: "failed", code: "unknown", message: FALLBACK_MESSAGE },
        ],
    ])("maps %j to %j instead of dropping it", (result, expected) => {
        expect(resultSchema.parse({ requestId: "r1", result }).result).toEqual(expected);
    });
});

describe("submit result codes", () => {
    it.each([
        ["invalid", "incomplete_card"],
        ["invalid", "invalid_billing_address"],
        ["invalid", "incomplete_bank_account"],
        ["failed", "save_failed"],
        ["failed", "select_failed"],
        ["unavailable", "not_ready"],
    ])("keeps the %s code %s", (status, code) => {
        expect(resultSchema.parse({ requestId: "r1", result: { status, code, message: "m" } }).result).toEqual({
            status,
            code,
            message: "m",
        });
    });

    it("turns a missing or unknown code into unknown and keeps the result", () => {
        expect(
            resultSchema.parse({ requestId: "r1", result: { status: "failed", code: "card_declined", message: "m" } })
                .result
        ).toEqual({ status: "failed", code: "unknown", message: "m" });
        expect(resultSchema.parse({ requestId: "r1", result: { status: "unavailable", message: "m" } }).result).toEqual(
            { status: "unavailable", code: "unknown", message: "m" }
        );
    });
});

describe("published code lists", () => {
    it.each([
        ["invalid", PAYMENT_METHOD_SUBMIT_INVALID_CODES],
        ["failed", PAYMENT_METHOD_SUBMIT_FAILED_CODES],
        ["unavailable", PAYMENT_METHOD_SUBMIT_UNAVAILABLE_CODES],
    ] as const)("keeps every published %s code", (status, codes) => {
        for (const code of codes) {
            expect(resultSchema.parse({ requestId: "r1", result: { status, code, message: "m" } }).result).toEqual({
                status,
                code,
                message: "m",
            });
        }
    });
});

describe("form state events", () => {
    const changeSchema = paymentMethodManagementIncomingEvents["payment-method:change"];

    it("accepts ready and a complete change", () => {
        expect(paymentMethodManagementIncomingEvents["payment-method:ready"].safeParse({}).success).toBe(true);
        expect(changeSchema.parse({ mode: "new", empty: false, complete: true })).toEqual({
            mode: "new",
            empty: false,
            complete: true,
        });
    });

    it("rejects a change without its state", () => {
        expect(changeSchema.safeParse({ mode: "new" }).success).toBe(false);
        expect(changeSchema.safeParse({ mode: "other", empty: true, complete: false }).success).toBe(false);
    });
});
