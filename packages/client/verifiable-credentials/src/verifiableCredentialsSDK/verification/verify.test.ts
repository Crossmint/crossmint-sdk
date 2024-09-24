import { NFTService } from "../onchainServices/nft";
import type { VerifiableCredential } from "../types/verifiableCredential";
import { VerifiableCredentialSignatureService } from "./signature";
import { verifyCredential } from "./verify";

jest.mock("./signature");
jest.mock("../onchainServices/nft");

describe("verifyCredential", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("should verify a valid credential", async () => {
        const mockCredential: VerifiableCredential = {
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(true);
        (NFTService.prototype.isBurnt as jest.Mock).mockResolvedValue(false);
        const result = await verifyCredential(mockCredential);
        expect(result).toEqual({ validVC: true, error: undefined });
    });

    it("should verify a valid credential without expiration date", async () => {
        const mockCredential: VerifiableCredential = {
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(true);
        (NFTService.prototype.isBurnt as jest.Mock).mockResolvedValue(false);
        const result = await verifyCredential(mockCredential);
        expect(result).toEqual({ validVC: true, error: undefined });
    });

    it("should fail if revoked credential", async () => {
        const mockCredential: VerifiableCredential = {
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(true);
        (NFTService.prototype.isBurnt as jest.Mock).mockResolvedValue(true);
        const result = await verifyCredential(mockCredential);
        expect(result).toEqual({ validVC: false, error: "Credential has been revoked" });
    });

    it("should fail if invalid proof credential", async () => {
        const mockCredential: VerifiableCredential = {
            validUntil: new Date(Date.now() + 86400000).toISOString(),
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(false);
        (NFTService.prototype.isBurnt as jest.Mock).mockResolvedValue(false);
        const result = await verifyCredential(mockCredential);
        expect(result).toEqual({ validVC: false, error: "Invalid proof" });
    });

    it("should fail if expirationDate is not a valid ISO string", async () => {
        const mockCredential: VerifiableCredential = {
            validUntil: "not a valid ISO string",
            nft: {} as any,
        } as any;
        await expect(verifyCredential(mockCredential)).rejects.toThrow(
            "Invalid expiration date: not a valid ISO string"
        );
    });
    it("should fail if expirationDate is not a string", async () => {
        const mockCredential: VerifiableCredential = {
            validUntil: 1,
            nft: {} as any,
        } as any;
        await expect(verifyCredential(mockCredential)).rejects.toThrow("expirationDate must be a ISO string");
    });

    it("should fail if expirationDate is in the past", async () => {
        const mockCredential: VerifiableCredential = {
            validUntil: new Date(Date.now() - 86400000).toISOString(), // 1 day in the past
            nft: {} as any,
        } as any;
        const result = await verifyCredential(mockCredential);
        expect(result).toEqual({ validVC: false, error: `Credential expired at ${mockCredential.validUntil}` });
    });
});
