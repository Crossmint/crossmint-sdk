import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { EventEmitter } from "./EventEmitter";
import type { SimpleMessageEvent, Transport } from "./transport/Transport";

const INCOMING_EVENTS = { "known:incoming": z.object({ id: z.string() }) };
const OUTGOING_EVENTS = { "known:outgoing": z.object({ id: z.string() }) };

function setup() {
    const listeners = new Map<string, (event: SimpleMessageEvent) => void>();
    const sent: { event: string; data: unknown }[] = [];
    let nextId = 0;

    const transport: Transport<typeof OUTGOING_EVENTS> = {
        send: (message) => sent.push(message as { event: string; data: unknown }),
        addMessageListener: (l) => {
            const id = `listener-${nextId++}`;
            listeners.set(id, l as (event: SimpleMessageEvent) => void);
            return id;
        },
        removeMessageListener: (id) => {
            listeners.delete(id);
        },
    };

    const emitter = new EventEmitter(transport, { ...INCOMING_EVENTS }, { ...OUTGOING_EVENTS });
    const deliver = (message: unknown) => {
        for (const l of listeners.values()) {
            l(message as SimpleMessageEvent);
        }
    };
    const deliverEvent = (event: string, data: object) => deliver({ type: "message", data: { event, data } });

    return { emitter, sent, listeners, deliver, deliverEvent };
}

describe("EventEmitter", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        vi.spyOn(console, "error").mockImplementation(() => undefined);
    });

    describe("when send() is given an event absent from the outgoing map", () => {
        test("throws a descriptive error and transmits nothing", () => {
            const { emitter, sent } = setup();

            // biome-ignore lint/suspicious/noExplicitAny: exercising an off-contract key on purpose
            expect(() => (emitter as any).send("unmapped:event", { anything: true })).toThrow(
                /No schema registered for outgoing event: unmapped:event/
            );
            expect(sent).toEqual([]);
        });

        test("throws for a name inherited from Object.prototype", () => {
            const { emitter, sent } = setup();

            // biome-ignore lint/suspicious/noExplicitAny: prototype keys must not resolve to a schema
            expect(() => (emitter as any).send("constructor", { anything: true })).toThrow(
                /No schema registered for outgoing event: constructor/
            );
            expect(sent).toEqual([]);
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

    describe("when on() is given an event absent from the incoming map", () => {
        test("reports the gap once at registration rather than per message", () => {
            const { emitter, deliverEvent } = setup();
            const callback = vi.fn();

            // biome-ignore lint/suspicious/noExplicitAny: exercising an off-contract key on purpose
            (emitter as any).on("unmapped:event", callback);
            expect(console.error).toHaveBeenCalledTimes(1);

            deliverEvent("unmapped:event", { anything: true });
            deliverEvent("unmapped:event", { anything: true });

            expect(callback).not.toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledTimes(1);
        });

        test("reports a name inherited from Object.prototype", () => {
            const { emitter, deliverEvent } = setup();
            const callback = vi.fn();

            // biome-ignore lint/suspicious/noExplicitAny: prototype keys must not resolve to a schema
            (emitter as any).on("toString", callback);
            expect(() => deliverEvent("toString", { anything: true })).not.toThrow();

            expect(callback).not.toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledTimes(1);
        });
    });

    describe("when on() receives a mapped event", () => {
        test("invokes the callback with the parsed payload", () => {
            const { emitter, deliverEvent } = setup();
            const callback = vi.fn();

            emitter.on("known:incoming", callback);
            deliverEvent("known:incoming", { id: "abc" });

            expect(callback).toHaveBeenCalledWith({ id: "abc" });
        });

        test("ignores a message with no payload", () => {
            const { emitter, deliver } = setup();
            const callback = vi.fn();

            emitter.on("known:incoming", callback);

            expect(() => deliver({ type: "message", data: null })).not.toThrow();
            expect(() => deliver({ type: "message" })).not.toThrow();
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("when a timeout reaches the caller as a rejection", () => {
        test("sendAction does not also report it as an error", async () => {
            const { emitter } = setup();

            await expect(
                emitter.sendAction({
                    event: "known:outgoing",
                    data: { id: "abc" },
                    responseEvent: "known:incoming",
                    options: { timeoutMs: 1 },
                })
            ).rejects.toBeTruthy();

            expect(console.error).not.toHaveBeenCalled();
        });

        test("onAction does not also report it as an error", async () => {
            const { emitter } = setup();

            await expect(emitter.onAction({ event: "known:incoming", options: { timeoutMs: 1 } })).rejects.toBeTruthy();

            expect(console.error).not.toHaveBeenCalled();
        });

        test("sendAction exhausting its retries does not report it as an error", async () => {
            const { emitter } = setup();

            await expect(
                emitter.sendAction({
                    event: "known:outgoing",
                    data: { id: "abc" },
                    responseEvent: "known:incoming",
                    options: { timeoutMs: 10_000, intervalMs: 1, maxRetries: 1 },
                })
            ).rejects.toBeTruthy();

            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe("when off() removes one of several listeners", () => {
        test("leaves the others receiving messages", () => {
            const { emitter, deliverEvent } = setup();
            const first = vi.fn();
            const second = vi.fn();

            const firstId = emitter.on("known:incoming", first);
            emitter.on("known:incoming", second);
            emitter.off(firstId);

            deliverEvent("known:incoming", { id: "abc" });

            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledWith({ id: "abc" });
        });
    });
});
