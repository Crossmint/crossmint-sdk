import { describe, expect, it } from "vitest";
import { createPkcePair, getPkceChallenge } from "./pkce";

const RFC_7636_VERIFIER_FORMAT = /^[A-Za-z0-9_-]{43}$/;

describe("getPkceChallenge", () => {
    it("matches the RFC 7636 example", () => {
        expect(getPkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    });
});

describe("createPkcePair", () => {
    it("returns a new RFC 7636 verifier on each call", () => {
        const first = createPkcePair();
        const second = createPkcePair();

        expect(first.verifier).toMatch(RFC_7636_VERIFIER_FORMAT);
        expect(first.verifier).not.toBe(second.verifier);
    });
});
