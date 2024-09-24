import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queueTask } from "./tasks";

describe("queueTask", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("should execute the callback when the end time is reached", () => {
        const mockCallback = vi.fn();
        const endTime = Date.now() + 1000; // 1 second from now

        queueTask(mockCallback, endTime);

        expect(mockCallback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1050);

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it("should not execute the callback if cancelled", () => {
        const mockCallback = vi.fn();
        const endTime = Date.now() + 1000; // 1 second from now

        const task = queueTask(mockCallback, endTime);

        task.cancel();

        vi.advanceTimersByTime(1050);

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it("should execute the callback immediately if end time is in the past", () => {
        const mockCallback = vi.fn();
        const endTime = Date.now() - 1000; // 1 second ago

        queueTask(mockCallback, endTime);

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });
});
