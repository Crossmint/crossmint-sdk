// @vitest-environment node
import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { toBigIntBE, toBigIntLE, toBufferBE, toBufferLE } from "./solana-bigint";

const require = createRequire(import.meta.url);
// The original package is a dev-only transitive build input, never a shipped import.
const original = require(join(dirname(require.resolve("bigint-buffer")), "browser.js")) as {
    toBigIntBE: typeof toBigIntBE;
    toBigIntLE: typeof toBigIntLE;
    toBufferBE: typeof toBufferBE;
    toBufferLE: typeof toBufferLE;
};

describe("native-free Solana integer conversions", () => {
    it("matches the original browser implementation in 2,700 deterministic round trips", () => {
        let state = 0x536;
        function nextByte() {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return state & 255;
        }
        for (let sample = 0; sample < 2_700; sample++) {
            const width = sample % 66;
            const bytes = Buffer.from(Array.from({ length: width }, nextByte));
            const unchanged = Buffer.from(bytes);
            const value = original.toBigIntBE(bytes);
            expect(toBigIntBE(bytes)).toBe(value);
            expect(toBigIntLE(bytes)).toBe(original.toBigIntLE(bytes));
            expect(toBufferBE(value, width)).toEqual(original.toBufferBE(value, width));
            expect(toBufferLE(value, width)).toEqual(original.toBufferLE(value, width));
            expect(toBigIntBE(toBufferBE(value, width))).toBe(value);
            expect(toBigIntLE(toBufferLE(value, width))).toBe(value);
            expect(bytes).toEqual(unchanged);
        }
    });

    it("handles known endianness, leading zeros, zero-width buffers, and oversized values", () => {
        const bytes = Buffer.from("000102f0", "hex");
        expect(toBigIntBE(bytes)).toBe(0x0102f0n);
        expect(toBigIntLE(bytes)).toBe(0xf0020100n);
        expect(toBufferBE(0x0102f0n, 4).toString("hex")).toBe("000102f0");
        expect(toBufferLE(0x0102f0n, 4).toString("hex")).toBe("f0020100");
        expect(toBigIntBE(Buffer.alloc(0))).toBe(0n);
        expect(toBigIntLE(Buffer.alloc(0))).toBe(0n);
        for (const value of [0n, 1n, 0x123n, 0x12345n, (1n << 1024n) - 1n]) {
            for (const width of [0, 1, 2, 3, 8]) {
                expect(toBufferBE(value, width)).toEqual(original.toBufferBE(value, width));
                expect(toBufferLE(value, width)).toEqual(original.toBufferLE(value, width));
            }
        }
        expect(toBufferBE(0x12345n, 2).toString("hex")).toBe("1234");
        expect(bytes.toString("hex")).toBe("000102f0");
    });

    it.each([8, 16, 24, 32])("round-trips the complete unsigned Solana %i-byte layout range", (width) => {
        const bits = BigInt(width * 8);
        for (const value of [0n, 1n, 1n << (bits / 2n), (1n << bits) - 1n]) {
            expect(toBigIntBE(toBufferBE(value, width))).toBe(value);
            expect(toBigIntLE(toBufferLE(value, width))).toBe(value);
        }
    });

    it("converts a large input entirely in JavaScript without mutating it", () => {
        const bytes = Buffer.alloc(4096, 255);
        const expected = (1n << BigInt(bytes.length * 8)) - 1n;
        expect(toBigIntBE(bytes)).toBe(expected);
        expect(toBigIntLE(bytes)).toBe(expected);
        expect(bytes.every((byte) => byte === 255)).toBe(true);
    });

    it("rejects values outside the unsigned integer API", () => {
        expect(() => toBufferBE(-1n, 8)).toThrow(RangeError);
        expect(() => toBufferLE(-1n, 8)).toThrow(RangeError);
        expect(() => toBufferBE(1 as unknown as bigint, 8)).toThrow(TypeError);
        for (const width of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
            expect(() => toBufferBE(0n, width)).toThrow(RangeError);
            expect(() => toBufferLE(0n, width)).toThrow(RangeError);
        }
    });
});
