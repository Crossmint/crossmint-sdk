import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyCrossmintJwt } from "./jwt";
import { getPublicKey } from "./publicKey";
import jwt from "jsonwebtoken";

vi.mock("./publicKey");

vi.mock("jsonwebtoken");

describe("verifyCrossmintJwt", () => {
    const mockToken = "mock.jwt.token";
    const mockJwksUri = "https://example.com/.well-known/jwks.json";
    const mockPublicKey = "-----BEGIN PUBLIC KEY-----\nMockPublicKey\n-----END PUBLIC KEY-----";
    const mockVerifiedToken = { sub: "user123", exp: 1234567890 };
    const originalConsoleError = console.error;

    beforeEach(() => {
        vi.resetAllMocks();
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
        vi.restoreAllMocks();
    });

    it("should verify a valid JWT token", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        vi.mocked(jwt.verify).mockReturnValue(mockVerifiedToken as any);

        const result = await verifyCrossmintJwt(mockToken, mockJwksUri);

        expect(getPublicKey).toHaveBeenCalledWith(mockToken, mockJwksUri);
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, mockPublicKey);
        expect(result).toEqual(mockVerifiedToken);
    });

    it("should throw an error for an invalid token", async () => {
        vi.mocked(getPublicKey).mockRejectedValue(new Error("Invalid token"));

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error for an expired token", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        const expiredError = new jwt.TokenExpiredError("jwt expired", new Date());
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw expiredError;
        });

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error for an invalid signature", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        const invalidSignatureError = new jwt.JsonWebTokenError("invalid signature");
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw invalidSignatureError;
        });

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error for an invalid algorithm", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        const invalidAlgorithmError = new jwt.JsonWebTokenError("invalid algorithm");
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw invalidAlgorithmError;
        });

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });

    it("should throw a generic error for other verification failures", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw new Error("Some other error");
        });

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error if verify returns null", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        vi.mocked(jwt.verify).mockReturnValue(null as any);

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });

    it("should throw an error if verify returns a string", async () => {
        vi.mocked(getPublicKey).mockResolvedValue(mockPublicKey);
        vi.mocked(jwt.verify).mockReturnValue("some string" as any);

        await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("Invalid token");
        expect(console.error).toHaveBeenCalled();
    });
});
