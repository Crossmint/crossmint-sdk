import { describe, expect, test } from "vitest";
import { objectValues } from "./utils";

describe("type utils", () => {
    describe("objectValues", () => {
        test("should return array of values from object", () => {
            const obj = { a: 1, b: "test", c: true };
            const values = objectValues(obj);
            expect(values).toEqual([1, "test", true]);
        });

        test("should handle empty object", () => {
            const obj = {};
            const values = objectValues(obj);
            expect(values).toEqual([]);
        });

        test("should handle object with single value", () => {
            const obj = { key: "value" };
            const values = objectValues(obj);
            expect(values).toEqual(["value"]);
        });

        test("should handle object with nested objects", () => {
            const obj = { a: { x: 1 }, b: { y: 2 } };
            const values = objectValues(obj);
            expect(values).toEqual([{ x: 1 }, { y: 2 }]);
        });

        test("should return immutable array", () => {
            const obj = { a: 1, b: 2 };
            const values = objectValues(obj);
            expect(Object.isFrozen(values)).toBe(true);
            expect(() => {
                // @ts-expect-error - Testing runtime immutability
                values.push(3);
            }).toThrow();
        });
    });
}); 