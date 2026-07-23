import { describe, it, expect } from "vitest";
import { getSignerLocator, parseSignerLocator } from "./signer-locator";
import type { Chain } from "../chains/chains";
import type { SignerConfigForChain } from "../signers/types";

describe("getSignerLocator", () => {
    describe("email signer — Gmail dot normalization", () => {
        it("strips dots from gmail.com local part", () => {
            const signer = { type: "email", email: "first.last@gmail.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:firstlast@gmail.com");
        });

        it("strips multiple dots from gmail.com local part", () => {
            const signer = { type: "email", email: "f.i.r.s.t@gmail.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:first@gmail.com");
        });

        it("normalizes googlemail.com to gmail.com", () => {
            const signer = { type: "email", email: "user@googlemail.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:user@gmail.com");
        });

        it("strips dots and normalizes googlemail.com domain", () => {
            const signer = { type: "email", email: "first.last@googlemail.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:firstlast@gmail.com");
        });

        it("lowercases Gmail addresses", () => {
            const signer = { type: "email", email: "First.Last@Gmail.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:firstlast@gmail.com");
        });

        it("does not strip dots from non-Gmail domains", () => {
            const signer = { type: "email", email: "first.last@company.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:first.last@company.com");
        });

        it("lowercases non-Gmail addresses", () => {
            const signer = { type: "email", email: "First.Last@Company.Com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:first.last@company.com");
        });

        it("preserves already-normalized Gmail addresses", () => {
            const signer = { type: "email", email: "noniepreggie@gmail.com" } as SignerConfigForChain<Chain>;
            expect(getSignerLocator(signer)).toBe("email:noniepreggie@gmail.com");
        });
    });

    it("returns external-wallet locator", () => {
        const signer = { type: "external-wallet", address: "0xABC" } as any;
        expect(getSignerLocator(signer)).toBe("external-wallet:0xABC");
    });

    it("returns phone locator", () => {
        const signer = { type: "phone", phone: "+1234567890" } as SignerConfigForChain<Chain>;
        expect(getSignerLocator(signer)).toBe("phone:+1234567890");
    });

    it("returns whatsapp locator", () => {
        const signer = { type: "whatsapp", phone: "+1234567890" } as SignerConfigForChain<Chain>;
        expect(getSignerLocator(signer)).toBe("whatsapp:+1234567890");
    });

    it("returns passkey locator", () => {
        const signer = { type: "passkey", id: "cred-123" } as SignerConfigForChain<Chain>;
        expect(getSignerLocator(signer)).toBe("passkey:cred-123");
    });

    it("returns api-key locator", () => {
        const signer = { type: "api-key" } as SignerConfigForChain<Chain>;
        expect(getSignerLocator(signer)).toBe("api-key");
    });

    it("returns device locator with existing locator", () => {
        const signer = { type: "device", locator: "device:0xPUBKEY" } as SignerConfigForChain<Chain>;
        expect(getSignerLocator(signer)).toBe("device:0xPUBKEY");
    });
});

describe("parseSignerLocator", () => {
    it("parses type:value format", () => {
        expect(parseSignerLocator("email:user@example.com")).toEqual({
            type: "email",
            value: "user@example.com",
        });
    });

    it("returns empty value for type-only locator", () => {
        expect(parseSignerLocator("api-key" as any)).toEqual({
            type: "api-key",
            value: "",
        });
    });
});
