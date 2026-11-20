import { describe, expect, it } from "vitest";
import { isValidAddress, isValidStellarAddress } from "./isValidAddress";

const STELLAR_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const STELLAR_CONTRACT = "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

describe("isValidStellarAddress", () => {
    describe("when the address is a StrKey account or contract id", () => {
        it("accepts it", () => {
            expect(isValidStellarAddress(STELLAR_ACCOUNT)).toBe(true);
            expect(isValidStellarAddress(STELLAR_CONTRACT)).toBe(true);
        });
    });

    describe("when the address starts with a pipe character", () => {
        it("rejects it", () => {
            const address = `|${STELLAR_ACCOUNT.slice(1)}`;
            expect(isValidStellarAddress(address)).toBe(false);
            expect(isValidAddress(address)).toBe(false);
        });
    });

    describe("when the address contains a character outside the base32 alphabet", () => {
        it.each(["0", "1", "8", "9"])("rejects the digit %s", (digit) => {
            const address = `${STELLAR_ACCOUNT.slice(0, -1)}${digit}`;
            expect(isValidStellarAddress(address)).toBe(false);
            expect(isValidAddress(address)).toBe(false);
        });
    });

    describe("when the address has the wrong length or prefix", () => {
        it("rejects it", () => {
            expect(isValidStellarAddress(STELLAR_ACCOUNT.slice(0, -1))).toBe(false);
            expect(isValidStellarAddress(`${STELLAR_ACCOUNT}A`)).toBe(false);
            expect(isValidStellarAddress(`S${STELLAR_ACCOUNT.slice(1)}`)).toBe(false);
            expect(isValidStellarAddress(STELLAR_ACCOUNT.toLowerCase())).toBe(false);
        });
    });
});
