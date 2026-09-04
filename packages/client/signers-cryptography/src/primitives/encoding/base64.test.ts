import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "./base64";

describe("base64 encoding", () => {
    it("encodes large byte arrays without exceeding the call stack", () => {
        const bytes = new Uint8Array(200_000);
        bytes.fill(65);

        expect(() => encodeBase64(bytes)).not.toThrow();
        expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
    });
});
