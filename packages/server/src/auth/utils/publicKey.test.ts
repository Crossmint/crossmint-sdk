import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicKey } from "./publicKey";
import { JwksClient } from "jwks-rsa";
import { decode } from "jsonwebtoken";

vi.mock("jsonwebtoken", () => ({
    decode: vi.fn(),
}));

vi.mock("jwks-rsa", () => ({
    JwksClient: vi.fn(),
}));

describe("getPublicKey", () => {
    const mockToken = "mock.jwt.token";
    const mockJwksUri = "https://example.com/.well-known/jwks.json";
    const mockKid = "mockKid123";
    const mockPublicKey = "-----BEGIN PUBLIC KEY-----\nMockPublicKey\n-----END PUBLIC KEY-----";
    const originalConsoleError = console.error;

    beforeEach(() => {
        vi.resetAllMocks();
        console.error = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        console.error = originalConsoleError;
    });

    it("should return a public key for a valid token", async () => {
        vi.mocked(decode).mockReturnValue({
            header: { kid: mockKid },
        });

        const mockGetSigningKey = vi.fn().mockResolvedValue({
            getPublicKey: () => mockPublicKey,
        });

        vi.mocked(JwksClient).mockImplementation(
            () =>
                ({
                    getSigningKey: mockGetSigningKey,
                }) as unknown as JwksClient
        );

        const result = await getPublicKey(mockToken, mockJwksUri);

        expect(decode).toHaveBeenCalledWith(mockToken, { complete: true });
        expect(JwksClient).toHaveBeenCalledWith({
            jwksUri: mockJwksUri,
            cache: true,
        });
        expect(mockGetSigningKey).toHaveBeenCalledWith(mockKid);
        expect(result).toBe(mockPublicKey);
    });

    it("should throw an error for an invalid token", async () => {
        vi.mocked(decode).mockReturnValue(null);

        await expect(getPublicKey(mockToken, mockJwksUri)).rejects.toThrow(
            "Invalid Token: Header Formatted Incorrectly"
        );
    });

    it("should throw an error when unable to retrieve signing key", async () => {
        vi.mocked(decode).mockReturnValue({
            header: { kid: mockKid },
        });

        const mockGetSigningKey = vi.fn().mockRejectedValue(new Error("Unable to fetch signing key"));

        vi.mocked(JwksClient).mockImplementation(
            () =>
                ({
                    getSigningKey: mockGetSigningKey,
                }) as unknown as JwksClient
        );

        await expect(getPublicKey(mockToken, mockJwksUri)).rejects.toThrow("Unable to retrieve signing key");
    });
});
