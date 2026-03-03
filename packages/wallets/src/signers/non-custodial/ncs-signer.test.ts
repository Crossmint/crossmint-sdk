import { describe, it, expect } from "vitest";
import { DEFAULT_EVENT_OPTIONS, POLLING_EVENT_OPTIONS } from "./ncs-signer";

describe("TEE event options", () => {
    it("DEFAULT_EVENT_OPTIONS should have timeout only (no intervalMs)", () => {
        expect(DEFAULT_EVENT_OPTIONS).toEqual({
            timeoutMs: 30_000,
        });
        expect(DEFAULT_EVENT_OPTIONS).not.toHaveProperty("intervalMs");
    });

    it("POLLING_EVENT_OPTIONS should have timeout and intervalMs for idempotent retries", () => {
        expect(POLLING_EVENT_OPTIONS).toEqual({
            timeoutMs: 30_000,
            intervalMs: 3_000,
        });
    });

    it("POLLING_EVENT_OPTIONS intervalMs should be shorter than timeoutMs", () => {
        expect(POLLING_EVENT_OPTIONS.intervalMs).toBeLessThan(POLLING_EVENT_OPTIONS.timeoutMs);
    });
});
