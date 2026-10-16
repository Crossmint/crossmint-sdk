import { describe, expect, test, vi } from "vitest";

import { sendTransactionReply } from "./sendTransactionReply";

function reply(outcome: Parameters<typeof sendTransactionReply>[1]) {
    const send = vi.fn();
    sendTransactionReply({ send }, outcome);
    return send;
}

describe("sendTransactionReply", () => {
    test("sends success for a non-empty string txId", () => {
        expect(reply({ txId: "0xtx" }).mock.calls).toEqual([["crypto:send-transaction:success", { txId: "0xtx" }]]);
    });

    test.each([[undefined], [""], [42], [null]])("sends failed, not rejected, for txId %s", (txId) => {
        expect(reply({ txId }).mock.calls).toEqual([
            ["crypto:send-transaction:failed", { error: "The wallet returned no transaction id", rejected: false }],
        ]);
    });

    test("marks rejected only when rejected is exactly true", () => {
        const declined = Object.assign(new Error("declined"), { rejected: true });
        expect(reply({ error: declined }).mock.calls).toEqual([
            ["crypto:send-transaction:failed", { error: "declined", rejected: true }],
        ]);
        const truthy = Object.assign(new Error("x"), { rejected: "yes" });
        expect(reply({ error: truthy }).mock.calls[0]?.[1]).toEqual({ error: "x", rejected: false });
    });

    test.each([
        [{ message: 42 }, "42"],
        [undefined, "The wallet failed"],
        ["boom", "The wallet failed"],
    ])("always sends a string error for %s", (error, expected) => {
        expect(reply({ error }).mock.calls[0]?.[1]).toEqual({ error: expected, rejected: false });
    });
});
