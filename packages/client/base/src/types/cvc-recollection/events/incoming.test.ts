import { describe, expect, it } from "vitest";
import { cvcRecollectionIncomingEvents } from "./incoming";

const resultSchema = cvcRecollectionIncomingEvents["cvc:result"];
const FALLBACK_MESSAGE = "The CVC recollection component returned an unexpected result. Please try again.";

describe("cvc:result schema", () => {
    it("keeps known statuses and rejects an empty requestId", () => {
        expect(resultSchema.parse({ requestId: "r1", result: { status: "complete" } }).result).toEqual({
            status: "complete",
        });
        expect(
            resultSchema.parse({ requestId: "r1", result: { status: "invalid", message: "Enter the CVC" } }).result
        ).toEqual({ status: "invalid", message: "Enter the CVC" });
        expect(
            resultSchema.parse({ requestId: "r1", result: { status: "failed", message: "Try again" } }).result
        ).toEqual({ status: "failed", message: "Try again" });
        expect(
            resultSchema.parse({
                requestId: "r1",
                result: { status: "refused", reason: "provider-error", message: "Declined" },
            }).result
        ).toEqual({ status: "refused", reason: "provider-error", message: "Declined" });
        expect(
            resultSchema.parse({ requestId: "r1", result: { status: "unavailable", message: "Not ready" } }).result
        ).toEqual({ status: "unavailable", message: "Not ready" });
        expect(resultSchema.safeParse({ requestId: "", result: { status: "complete" } }).success).toBe(false);
    });

    it.each([
        [
            { status: "requires_action", message: "x" },
            { status: "failed", message: "x" },
        ],
        [{ status: "requires_action" }, { status: "failed", message: FALLBACK_MESSAGE }],
        [{ status: "invalid" }, { status: "failed", message: FALLBACK_MESSAGE }],
        [
            { status: "refused", reason: "not-a-reason", message: "x" },
            { status: "failed", message: "x" },
        ],
    ])("maps %j to %j instead of dropping it", (result, expected) => {
        expect(resultSchema.parse({ requestId: "r1", result }).result).toEqual(expected);
    });
});
