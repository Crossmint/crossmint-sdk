import type { EncryptedVerifiableCredential, VerifiableCredential } from "../types/verifiableCredential";
import { isEncryptedVerifiableCredential, isVcChain, parseLocator } from "./utils";

describe("utils", () => {
    describe("isPolygon", () => {
        it("returns true if the chain includes 'poly'", () => {
            expect(isVcChain("polygon")).toBe(true);
        });

        it("returns true if the chain is poly-amoy", () => {
            expect(isVcChain("poly-amoy")).toBe(true);
        });

        it("returns false if the chain does not include 'poly'", () => {
            expect(isVcChain("ethereum")).toBe(false);
        });
    });

    describe("parseLocator", () => {
        it("parses a valid locator string", () => {
            const locator = "ethereum:0x1234:5678";
            const result = parseLocator(locator);

            expect(result).toEqual({
                chain: "ethereum" as any,
                contractAddress: "0x1234",
                tokenId: "5678",
            });
        });

        it("throws an error for an invalid locator string", () => {
            const locator = "ethereum";

            expect(() => parseLocator(locator)).toThrowError(
                "Invalid locator format, expected <chain>:<contractAddress>:<tokenId>"
            );
        });
    });

    describe("isEncryptedVerifiableCredential", () => {
        it("returns true if the credential is an EncryptedVerifiableCredential", () => {
            const encryptedCredential: EncryptedVerifiableCredential = {
                id: "id",
                payload: "payload",
            };

            expect(isEncryptedVerifiableCredential(encryptedCredential)).toBe(true);
        });

        it("returns false if the credential is not an EncryptedVerifiableCredential", () => {
            const verifiableCredential: VerifiableCredential = {
                id: "id",
                type: ["type"],
                issuer: { id: "issuer" },
                issuanceDate: "2022-01-01T00:00:00.000Z",
                credentialSubject: {},
            } as any;

            expect(isEncryptedVerifiableCredential(verifiableCredential)).toBe(false);
        });
    });
});
