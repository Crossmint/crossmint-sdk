import { verifyTypedData } from "@ethersproject/wallet";

import { VerifiableCredential } from "../../types/verifiableCredential";
import { VerifiableCredentialSignatureService } from "./signature";

jest.mock("@krebitdao/eip712-vc", () => {
    return {
        EIP712VC: jest.fn().mockImplementation(() => {}),
    };
});
jest.mock("@ethersproject/wallet");

class MockSigner {
    verifyW3CCredential = jest.fn().mockImplementation((issuerId, cred: any, a, b, c) => cred.id == "valid");
    getDomainTypedData = jest.fn();
}

describe("VerifiableCredentialSignatureService", () => {
    let service: VerifiableCredentialSignatureService;

    beforeEach(() => {
        service = new VerifiableCredentialSignatureService(MockSigner as any);
        jest.resetAllMocks();
    });

    it("should verify a valid credential", async () => {
        const mockCredential: VerifiableCredential = {
            id: "valid",
            issuer: { id: "did:chain:address" },
            proof: {
                eip712: {
                    domain: {},
                    types: {},
                },
                proofValue: "proofValue",
            },
            // other fields...
        } as any;

        const result = await service.verify(mockCredential);

        expect(result).toBe(true);
    });

    it("should fail a invalid credential", async () => {
        const mockCredential: VerifiableCredential = {
            id: "nonValid",
            issuer: { id: "did:chain:address" },
            proof: {
                eip712: {
                    domain: {},
                    types: {},
                },
                proofValue: "proofValue",
            },
            // other fields...
        } as any;

        const result = await service.verify(mockCredential);

        expect(result).toBe(false);
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
