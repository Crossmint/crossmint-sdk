import { describe, it, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";
import { createJWKSClient } from "./jwksClient";
import { errors } from "jose";
import { verifyCrossmintJwt } from "./jwt";

vi.mock("jose", () => ({
    createRemoteJWKSet: vi.fn(),
    jwtVerify: vi.fn(),
    errors: {
        JWTExpired: class JWTExpired extends Error {
            payload: { exp?: number };
            constructor(message: string, payload: { exp?: number }) {
                super(message);
                this.payload = payload;
            }
        },
        JWSSignatureVerificationFailed: class JWSSignatureVerificationFailed extends Error {},
    },
}));

vi.mock("./jwksClient", () => ({
    createJWKSClient: vi.fn(),
}));

describe("JWT Verification", () => {
    const mockToken = "mock.jwt.token";
    const mockJwksUri = "https://example.com/.well-known/jwks.json";
    const mockJwks = {} as any;
    const mockPayload = { sub: "123", iat: 1234567890 };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(createJWKSClient).mockReturnValue(mockJwks);
        vi.mocked(jwtVerify).mockReset();
    });

    describe("verifyCrossmintJwt", () => {
        it("should successfully verify a valid JWT", async () => {
            vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload } as any);

            const result = await verifyCrossmintJwt(mockToken, mockJwksUri);

            expect(createJWKSClient).toHaveBeenCalledWith(mockJwksUri);
            expect(jwtVerify).toHaveBeenCalledWith(mockToken, mockJwks);
            expect(result).toEqual(mockPayload);
        });

        it("should throw error for expired JWT", async () => {
            const expiredTimestamp = 1234567890;
            const expiredDate = new Date(expiredTimestamp * 1000).toISOString();

            vi.mocked(jwtVerify).mockRejectedValue(new errors.JWTExpired("token expired", { exp: expiredTimestamp }));

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow(
                `JWT provided expired at timestamp ${expiredDate}`
            );
        });

        it("should handle expired JWT with unknown expiration", async () => {
            vi.mocked(jwtVerify).mockRejectedValue(new errors.JWTExpired("token expired", { exp: undefined }));

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow(
                "JWT provided expired at timestamp unknown"
            );
        });

        it("should throw error for signature verification failure", async () => {
            vi.mocked(jwtVerify).mockRejectedValue(new errors.JWSSignatureVerificationFailed());

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("signature verification failed");
        });

        it("should throw error for invalid algorithm", async () => {
            vi.mocked(jwtVerify).mockRejectedValue(new Error("invalid algorithm"));

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow("invalid algorithm");
        });

        it("should propagate unknown errors", async () => {
            const unknownError = new Error("unknown error");
            vi.mocked(jwtVerify).mockRejectedValue(unknownError);

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow(unknownError);
        });

        it("should propagate JWKS client errors", async () => {
            const jwksError = new Error("JWKS client error");
            vi.mocked(createJWKSClient).mockImplementation(() => {
                throw jwksError;
            });

            await expect(verifyCrossmintJwt(mockToken, mockJwksUri)).rejects.toThrow(jwksError);
        });
    });
});
