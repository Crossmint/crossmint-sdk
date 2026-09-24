import { afterEach, describe, expect, test, vi } from "vitest";

import { ConsoleSink } from "./ConsoleSink";

describe("ConsoleSink", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("when the entry has context", () => {
        test("emits a single string containing the serialized context", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(vi.fn());

            new ConsoleSink().write({
                level: "warn",
                message: "wallet.send.error",
                context: { reason: "execution_reverted", message: "insufficient gas" },
                timestamp: Date.now(),
            });

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(
                '[SDK] wallet.send.error {"reason":"execution_reverted","message":"insufficient gas"}'
            );
        });

        test("serializes bigint, Error and circular values instead of throwing", () => {
            const info = vi.spyOn(console, "info").mockImplementation(vi.fn());
            const circular: Record<string, unknown> = {};
            circular.self = circular;

            new ConsoleSink().write({
                level: "info",
                message: "msg",
                context: { amount: 10n, error: new Error("boom"), circular },
                timestamp: Date.now(),
            });

            const [output] = info.mock.calls[0] as [string];
            expect(output).toContain('"amount":"10"');
            expect(output).toContain('"message":"boom"');
            expect(output).toContain('"self":"[Circular]"');
        });
    });

    describe("when the entry has no context", () => {
        test("emits only the prefixed message", () => {
            const info = vi.spyOn(console, "info").mockImplementation(vi.fn());

            new ConsoleSink().write({ level: "info", message: "hello", context: {}, timestamp: Date.now() });

            expect(info).toHaveBeenCalledWith("[SDK] hello");
        });
    });
});
