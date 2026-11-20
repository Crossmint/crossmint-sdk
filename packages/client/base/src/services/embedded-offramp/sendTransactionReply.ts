import type { EmbeddedOfframpIFrameEmitter } from "@/types/embedded-offramp/events";

export type SendTransactionOutcome = { txId: unknown } | { error: unknown };

function describe(message: unknown) {
    try {
        return message == null ? "The wallet failed" : String(message);
    } catch {
        return "The wallet failed";
    }
}

/** Sends exactly one reply event for the transaction request. */
export function sendTransactionReply(
    emitter: Pick<EmbeddedOfframpIFrameEmitter, "send">,
    outcome: SendTransactionOutcome
) {
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

export type SignMessageOutcome = { signature: unknown } | { error: unknown };

/** Sends exactly one reply event for the message signature request. */
export function signMessageReply(emitter: Pick<EmbeddedOfframpIFrameEmitter, "send">, outcome: SignMessageOutcome) {
    if ("error" in outcome) {
        const { message, rejected } = (outcome.error ?? {}) as { message?: unknown; rejected?: unknown };
        emitter.send("crypto:sign-message:failed", { error: describe(message), rejected: rejected === true });
    } else if (typeof outcome.signature === "string" && outcome.signature !== "") {
        emitter.send("crypto:sign-message:success", { signature: outcome.signature });
    } else {
        emitter.send("crypto:sign-message:failed", { error: "The wallet returned no signature", rejected: false });
    }
}
