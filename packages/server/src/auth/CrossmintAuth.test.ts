import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintAuth } from "./CrossmintAuth";
import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { type AuthMaterialBasic, CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";
import * as cookiesUtils from "./utils/cookies";
import * as jwtUtils from "./utils/jwt";
import type { GenericRequest } from "./types/request";

vi.mock("@crossmint/common-sdk-base");
vi.mock("./utils/cookies");
vi.mock("./utils/jwt");

describe("CrossmintAuth", () => {
    let crossmintAuth: CrossmintAuth;
    const mockCrossmint = { projectId: "test-project-id" };
    const mockApiClient = {
        baseUrl: "https://api.crossmint.com",
        post: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(CrossmintApiClient).mockReturnValue(mockApiClient as unknown as CrossmintApiClient);
        crossmintAuth = CrossmintAuth.from(mockCrossmint as unknown as Crossmint);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("from", () => {
        it("should create a new CrossmintAuth instance", () => {
            expect(crossmintAuth).toBeInstanceOf(CrossmintAuth);
            expect(CrossmintApiClient).toHaveBeenCalledWith(mockCrossmint, expect.any(Object));
        });
    });

    describe("getJwksUri", () => {
        it("should return the correct JWKS URI", () => {
            expect(crossmintAuth.getJwksUri()).toBe("https://api.crossmint.com/.well-known/jwks.json");
        });
    });

    describe("verifyCrossmintJwt", () => {
        it("should call verifyCrossmintJwt with correct parameters", async () => {
            const mockToken = "mock.jwt.token";
            const mockDecodedJwt = { sub: "user123" };
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue(mockDecodedJwt);

            const result = await crossmintAuth.verifyCrossmintJwt(mockToken);

            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenCalledWith(
                mockToken,
                "https://api.crossmint.com/.well-known/jwks.json"
            );
            expect(result).toBe(mockDecodedJwt);
        });
    });

    describe("getSession", () => {
        const mockRequest = { headers: { cookie: "mock-cookie" } };
        const mockAuthMaterial = {
            jwt: "mock.jwt.token",
            refreshToken: "mock-refresh-token",
        };

        it("should return a valid session when JWT is valid", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue({ sub: "user123" });

            const result = await crossmintAuth.getSession(mockRequest as GenericRequest);

            expect(result).toEqual({
                jwt: "mock.jwt.token",
                userId: "user123",
            });
        });

        it("should refresh the session when JWT is invalid", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockRejectedValue(new Error("Invalid token"));
            mockApiClient.post.mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        jwt: "new.jwt.token",
                        refresh: "new-refresh-token",
                        user: { id: "user456" },
                    }),
            });

            const result = await crossmintAuth.getSession(mockRequest as GenericRequest);

            expect(result).toEqual({
                jwt: "new.jwt.token",
                userId: "user456",
            });
            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/refresh",
                expect.any(Object)
            );
        });

        it("should throw CrossmintAuthenticationError when refresh token is not found", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue({ jwt: "mock.jwt.token" } as AuthMaterialBasic);

            await expect(crossmintAuth.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                CrossmintAuthenticationError
            );
            await expect(crossmintAuth.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                "Refresh token not found"
            );
        });

        it("should throw CrossmintAuthenticationError when session retrieval fails", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockRejectedValue(new Error("Invalid token"));
            mockApiClient.post.mockRejectedValue(new Error("API error"));

            await expect(crossmintAuth.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                CrossmintAuthenticationError
            );
            await expect(crossmintAuth.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                "Failed to get session"
            );
        });
    });
});
