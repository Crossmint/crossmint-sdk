import { describe, expect, it } from "vitest";
import { base64UrlToBytes, bytesToBase64Url } from "./base64url";

describe("base64url", () => {
    it("round-trips bytes of every length", () => {
        for (let length = 0; length < 8; length++) {
            const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 251) % 256);
            expect(base64UrlToBytes(bytesToBase64Url(bytes))).toEqual(bytes);
        }
    });

    it("decodes standard base64 with padding too", () => {
        expect(base64UrlToBytes("+/8=")).toEqual(Uint8Array.of(0xfb, 0xff));
        expect(base64UrlToBytes("-_8")).toEqual(Uint8Array.of(0xfb, 0xff));
    });
});
