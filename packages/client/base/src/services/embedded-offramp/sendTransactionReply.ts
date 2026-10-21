export type SendTransactionReplyEmitter = {
    send(event: "crypto:send-transaction:success", data: { txId: string }): void;
    send(event: "crypto:send-transaction:failed", data: { error: string; rejected: boolean }): void;
};

export type SendTransactionOutcome = { txId: unknown } | { error: unknown };

function describe(message: unknown) {
    try {
        return message == null ? "The wallet failed" : String(message);
    } catch {
        return "The wallet failed";
    }
}

/** Sends exactly one reply event for the transaction request. */
export function sendTransactionReply(emitter: SendTransactionReplyEmitter, outcome: SendTransactionOutcome) {
    if ("error" in outcome) {
        const { message, rejected } = (outcome.error ?? {}) as { message?: unknown; rejected?: unknown };
        emitter.send("crypto:send-transaction:failed", {
            error: describe(message),
            rejected: rejected === true,
        });
    } else if (typeof outcome.txId === "string" && outcome.txId !== "") {
        emitter.send("crypto:send-transaction:success", { txId: outcome.txId });
    } else {
        emitter.send("crypto:send-transaction:failed", {
            error: "The wallet returned no transaction id",
            rejected: false,
        });
    }
}
