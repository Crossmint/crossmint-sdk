import { VerifiableCredential } from "../../types/verifiableCredential";
import credentialData from "./mockCredential.json";
import { VerifiableCredentialSignatureService } from "./signature";

const mockCredential = credentialData as VerifiableCredential;
describe("VerifiableCredentialSignatureService", () => {
    let service: VerifiableCredentialSignatureService;

    beforeEach(() => {
        service = new VerifiableCredentialSignatureService();
    });

    it("should fail when tampered credential", async () => {
        const credential = { ...mockCredential };
        credential.expirationDate = "2322-12-12";

        await expect(service.verify(credential)).resolves.toBeFalsy();
    });

    it("should correctly verify a valid proof", async () => {
        await expect(service.verify(mockCredential)).resolves.toBeTruthy();
    });

    it("should throw error for invalid issuer DID", async () => {
        const mockCredential: VerifiableCredential = {
            issuer: { id: "invalidDID" },
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
});
