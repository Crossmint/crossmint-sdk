import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { useLatest } from "./useLatest";

describe("useLatest", () => {
    describe("when the value changes", () => {
        test("exposes the new value during that same render, not after the effects flush", () => {
            const seenDuringRender: number[] = [];
            const { rerender } = renderHook(
                ({ value }) => {
                    seenDuringRender.push(useLatest(value).current);
                },
                { initialProps: { value: 1 } }
            );

            rerender({ value: 2 });

            expect(seenDuringRender).toEqual([1, 2]);
        });
    });
});
