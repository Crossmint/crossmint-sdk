import { mockCredential } from "../types/mockCredential";
import type { VerifiableCredential } from "../types/verifiableCredential";
import { VerifiableCredentialSignatureService } from "./signature";

describe("VerifiableCredentialSignatureService", () => {
    let service: VerifiableCredentialSignatureService;

    beforeEach(() => {
        service = new VerifiableCredentialSignatureService();
        jest.resetAllMocks();
    });

    it("should verify a valid credential", async () => {
        const result = await service.verify(mockCredential);

        expect(result).toBe(true);
    });

    it("should fail a invalid credential", async () => {
        const invalidCredential: VerifiableCredential = {
            ...mockCredential,
            proof: {
                ...mockCredential.proof,
                proofValue:
                    "0x5b88ebef582fa631bca407e9b6454190a0346de45285add0ffe19a4f374acc6463f1f418c60bc76fb6168884a763fb4e28297f3f8a1c381debedf4e2deb293fe1c",
            },
        };

        const result = await service.verify(invalidCredential);

        expect(result).toBe(false);
    });

    it("should throw error for invalid issuer DID", async () => {
        const mockCredential: VerifiableCredential = {
            issuer: { id: "invalidDID" },
            proof: {},
        } as any;

        (await expect(service.verify(mockCredential)).rejects.toThrow(
            "Issuer DID should be in the format did:{chain}:{address}"
        )) as any;
    });

    it("should throw error for missing proof", async () => {
        const mockCredential: VerifiableCredential = {
            issuer: { id: "did:chain:address" },
        } as any;

        await expect(service.verify(mockCredential)).rejects.toThrow("No proof associated with credential");
    });

    it("should throw error for tampered issuer address", async () => {
        const mockCredential: VerifiableCredential = {
            issuer: { id: "did:chain:address" },
            proof: {},
        } as any;

        await expect(service.verify(mockCredential)).rejects.toThrow("Malformed issuer address");
    });
});
