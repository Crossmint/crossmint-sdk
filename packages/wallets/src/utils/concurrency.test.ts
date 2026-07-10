import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
    it("maps all items when there are fewer items than the limit", async () => {
        const items = [1, 2, 3];

        const results = await mapWithConcurrency(items, 10, async (item) => item * 2);

        expect(results).toEqual([2, 4, 6]);
    });

    it("preserves input order when there are more items than the limit", async () => {
        const items = Array.from({ length: 20 }, (_, i) => i);
        let inFlight = 0;
        let maxInFlight = 0;

        const results = await mapWithConcurrency(items, 5, async (item) => {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            // Stagger completion so items don't resolve strictly in start order.
            await new Promise((resolve) => setTimeout(resolve, (items.length - item) % 5));
            inFlight--;
            return item * 2;
        });

        expect(results).toEqual(items.map((item) => item * 2));
        expect(maxInFlight).toBeLessThanOrEqual(5);
    });

    it("does not let one item's rejection affect other items' results or halt the pool", async () => {
        const items = Array.from({ length: 9 }, (_, i) => i);

        const results = await mapWithConcurrency(items, 3, async (item) => {
            await Promise.resolve();
            if (item % 3 === 0) {
                try {
                    throw new Error(`boom-${item}`);
                } catch {
                    return null;
                }
            }
            return item;
        });

        expect(results).toHaveLength(9);
        expect(results).toEqual([null, 1, 2, null, 4, 5, null, 7, 8]);
    });
});
