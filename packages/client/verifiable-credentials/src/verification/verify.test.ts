import { VerifiableCredential } from "../types/verifiableCredential";
import { NFTStatusService } from "./services/nftStatus";
import { VerifiableCredentialSignatureService } from "./services/signature";
import { verifyCredential } from "./verify";

jest.mock("./services/signature");
jest.mock("./services/nftStatus");
jest.mock("@krebitdao/eip712-vc", () => {
    return {
        EIP712VC: jest.fn().mockImplementation(() => {}),
    };
});
describe("verifyCredential", () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it("should verify a valid credential", async () => {
        const mockCredential: VerifiableCredential = {
            expirationDate: new Date(Date.now() + 86400000).toISOString(),
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(true);
        (NFTStatusService.prototype.isBurnt as jest.Mock).mockResolvedValue(false);
        const result = await verifyCredential(mockCredential, "staging");
        expect(result).toEqual({ validVC: true, error: undefined });
    });

    it("should fail if revoked credential", async () => {
        const mockCredential: VerifiableCredential = {
            expirationDate: new Date(Date.now() + 86400000).toISOString(),
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(true);
        (NFTStatusService.prototype.isBurnt as jest.Mock).mockResolvedValue(true);
        const result = await verifyCredential(mockCredential, "staging");
        expect(result).toEqual({ validVC: false, error: "Credential has been revoked" });
    });

    it("should fail if invalid proof credential", async () => {
        const mockCredential: VerifiableCredential = {
            expirationDate: new Date(Date.now() + 86400000).toISOString(),
            nft: {} as any,
        } as any;
        (VerifiableCredentialSignatureService.prototype.verify as jest.Mock).mockResolvedValue(false);
        (NFTStatusService.prototype.isBurnt as jest.Mock).mockResolvedValue(false);
        const result = await verifyCredential(mockCredential, "staging");
        expect(result).toEqual({ validVC: false, error: "Invalid proof" });
    });

    it("should fail if expirationDate is not a valid ISO string", async () => {
        const mockCredential: VerifiableCredential = {
            expirationDate: "not a valid ISO string",
            nft: {} as any,
        } as any;
        await expect(verifyCredential(mockCredential, "staging")).rejects.toThrow(
            "Invalid expiration date: not a valid ISO string"
        );
    });
    it("should fail if expirationDate is not a string", async () => {
        const mockCredential: VerifiableCredential = {
            expirationDate: 1,
            nft: {} as any,
        } as any;
        await expect(verifyCredential(mockCredential, "staging")).rejects.toThrow(
            "expirationDate must be a ISO string"
        );
    });

    it("should fail if expirationDate is in the past", async () => {
        const mockCredential: VerifiableCredential = {
            expirationDate: new Date(Date.now() - 86400000).toISOString(), // 1 day in the past
            nft: {} as any,
        } as any;
        const result = await verifyCredential(mockCredential, "staging");
        expect(result).toEqual({ validVC: false, error: `Credential expired at ${mockCredential.expirationDate}` });
    });
});
