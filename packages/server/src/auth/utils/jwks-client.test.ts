import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createJWKSClient } from "./jwksClient";
import { createRemoteJWKSet } from "jose";

vi.mock("jose", () => ({
    createRemoteJWKSet: vi.fn(),
}));

describe("createJWKSClient", () => {
    const validJwksUri = "https://example.com/.well-known/jwks.json";
    const retryJwksUri = "https://retry.example.com/.well-known/jwks.json";
    const cachedJwksUri = "https://cached.example.com/.well-known/jwks.json";
    const originalConsoleError = console.error;

    beforeEach(() => {
        vi.resetAllMocks();
        console.error = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        console.error = originalConsoleError;
    });

    it("creates a JWKS client for a valid URI", () => {
        const mockJWKSFunction = vi.fn() as unknown as ReturnType<typeof createRemoteJWKSet>;
        vi.mocked(createRemoteJWKSet).mockReturnValue(mockJWKSFunction);

        const result = createJWKSClient(validJwksUri);

        expect(createRemoteJWKSet).toHaveBeenCalledWith(
            new URL(validJwksUri),
            expect.objectContaining({
                cacheMaxAge: 600000,
            })
        );
        expect(result).toBe(mockJWKSFunction);
    });

    it("retries client creation after a failure", () => {
        const mockJWKSFunction = vi.fn() as unknown as ReturnType<typeof createRemoteJWKSet>;
        vi.mocked(createRemoteJWKSet)
            .mockImplementationOnce(() => {
                throw new Error("Failed to create JWKS client");
            })
            .mockReturnValue(mockJWKSFunction);

        expect(() => createJWKSClient(retryJwksUri)).toThrow("Unable to create JWKS client");
        expect(console.error).toHaveBeenCalled();
        expect(createJWKSClient(retryJwksUri)).toBe(mockJWKSFunction);
        expect(createRemoteJWKSet).toHaveBeenCalledTimes(2);
    });

    it("reuses a client for repeated calls with the same URI", () => {
        const mockJWKSFunction = vi.fn() as unknown as ReturnType<typeof createRemoteJWKSet>;
        vi.mocked(createRemoteJWKSet).mockReturnValue(mockJWKSFunction);

        const firstClient = createJWKSClient(cachedJwksUri);
        const secondClient = createJWKSClient(cachedJwksUri);

        expect(secondClient).toBe(firstClient);
        expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
    });
});
