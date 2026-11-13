import { describe, expect, test, vi } from "vitest";

import { sendTransactionReply, signMessageReply } from "./sendTransactionReply";

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

    test("falls back when the message cannot be stringified", () => {
        const message = Object.create(null);
        expect(reply({ error: { message } }).mock.calls[0]?.[1]).toEqual({
            error: "The wallet failed",
            rejected: false,
        });
    });
});

function signReply(outcome: Parameters<typeof signMessageReply>[1]) {
    const send = vi.fn();
    signMessageReply({ send }, outcome);
    return send;
}

describe("signMessageReply", () => {
    test("sends success for a non-empty string signature", () => {
        expect(signReply({ signature: "0xsig" }).mock.calls).toEqual([
            ["crypto:sign-message:success", { signature: "0xsig" }],
        ]);
    });

    test.each([[undefined], [""], [42], [null], [new Uint8Array(64)]])(
        "sends failed, not rejected, for signature %s",
        (signature) => {
            expect(signReply({ signature }).mock.calls).toEqual([
                ["crypto:sign-message:failed", { error: "The wallet returned no signature", rejected: false }],
            ]);
        }
    );

    test.each([
        [Object.assign(new Error("declined"), { rejected: true }), { error: "declined", rejected: true }],
        [Object.assign(new Error("x"), { rejected: "yes" }), { error: "x", rejected: false }],
        [new Error("boom"), { error: "boom", rejected: false }],
        [undefined, { error: "The wallet failed", rejected: false }],
        [{ message: Object.create(null) }, { error: "The wallet failed", rejected: false }],
    ])("sends one failed reply for error %s", (error, expected) => {
        expect(signReply({ error }).mock.calls).toEqual([["crypto:sign-message:failed", expected]]);
    });
});
