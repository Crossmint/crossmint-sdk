import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJWKSClient } from "./jwksClient";
import { createRemoteJWKSet } from "jose";

vi.mock("jose", () => ({
    createRemoteJWKSet: vi.fn(),
}));

describe("createJWKSClient", () => {
    const mockJwksUri = "https://example.com/.well-known/jwks.json";
    const originalConsoleError = console.error;

    beforeEach(() => {
        vi.resetAllMocks();
        console.error = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        console.error = originalConsoleError;
    });

    it("should create a JWKS client for a valid URI", () => {
        const mockJWKSFunction = vi.fn() as unknown as ReturnType<typeof createRemoteJWKSet>;
        vi.mocked(createRemoteJWKSet).mockReturnValue(mockJWKSFunction);

        const result = createJWKSClient(mockJwksUri);

        expect(createRemoteJWKSet).toHaveBeenCalledWith(
            new URL(mockJwksUri),
            expect.objectContaining({
                cacheMaxAge: 600000,
            })
        );
        expect(result).toBe(mockJWKSFunction);
    });

    it("should throw an error when unable to create JWKS client", () => {
        vi.mocked(createRemoteJWKSet).mockImplementation(() => {
            throw new Error("Failed to create JWKS client");
        });

        expect(() => createJWKSClient(mockJwksUri)).toThrow("Unable to create JWKS client");
        expect(console.error).toHaveBeenCalled();
    });
});
