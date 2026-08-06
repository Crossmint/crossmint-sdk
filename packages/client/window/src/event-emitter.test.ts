import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { EventEmitter } from "./EventEmitter";
import type { SimpleMessageEvent, Transport } from "./transport/Transport";

const incomingEvents = { "known:incoming": z.object({ id: z.string() }) };
const outgoingEvents = { "known:outgoing": z.object({ id: z.string() }) };

function setup() {
    let listener: ((event: SimpleMessageEvent) => void) | undefined;
    const sent: { event: string; data: unknown }[] = [];

    const transport: Transport<typeof outgoingEvents> = {
        send: (message) => sent.push(message as { event: string; data: unknown }),
        addMessageListener: (l) => {
            listener = l as (event: SimpleMessageEvent) => void;
            return "listener-id";
        },
        removeMessageListener: () => undefined,
    };

    const emitter = new EventEmitter(transport, incomingEvents, outgoingEvents);
    const deliver = (event: string, data: object) => listener?.({ type: "message", data: { event, data } });

    return { emitter, sent, deliver };
}

describe("EventEmitter", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    describe("when send() is given an event absent from the outgoing map", () => {
        // A missing key is a map-sync gap on our side, so the event must still go out.
        // Dropping it would reproduce the failure this guard exists to prevent.
        test("warns and transmits the event unvalidated", () => {
            const { emitter, sent } = setup();

            // biome-ignore lint/suspicious/noExplicitAny: exercising an off-contract key on purpose
            (emitter as any).send("unmapped:event", { anything: true });

            expect(sent).toEqual([{ event: "unmapped:event", data: { anything: true } }]);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("unmapped:event"));
        });

        test("does not throw", () => {
            const { emitter } = setup();

            // biome-ignore lint/suspicious/noExplicitAny: exercising an off-contract key on purpose
            expect(() => (emitter as any).send("unmapped:event", {})).not.toThrow();
        });
    });

    describe("when send() is given a mapped event", () => {
        test("transmits a payload that satisfies the schema", () => {
            const { emitter, sent } = setup();

            emitter.send("known:outgoing", { id: "abc" });

            expect(sent).toEqual([{ event: "known:outgoing", data: { id: "abc" } }]);
        });

        test("drops a payload that violates the schema", () => {
            const { emitter, sent } = setup();

            // biome-ignore lint/suspicious/noExplicitAny: deliberately invalid payload
            emitter.send("known:outgoing", { id: 42 } as any);

            expect(sent).toEqual([]);
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe("when on() receives an event absent from the incoming map", () => {
        test("warns and skips the callback without throwing", () => {
            const { emitter, deliver } = setup();
            const callback = vi.fn();

            // biome-ignore lint/suspicious/noExplicitAny: exercising an off-contract key on purpose
            (emitter as any).on("unmapped:event", callback);
            expect(() => deliver("unmapped:event", { anything: true })).not.toThrow();

            expect(callback).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("unmapped:event"));
        });
    });

    describe("when on() receives a mapped event", () => {
        test("invokes the callback with the parsed payload", () => {
            const { emitter, deliver } = setup();
            const callback = vi.fn();

            emitter.on("known:incoming", callback);
            deliver("known:incoming", { id: "abc" });

            expect(callback).toHaveBeenCalledWith({ id: "abc" });
        });
    });
});
