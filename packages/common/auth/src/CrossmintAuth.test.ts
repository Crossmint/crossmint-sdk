import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintAuth } from "./CrossmintAuth";
import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";

vi.mock("@crossmint/common-sdk-base");

describe("CrossmintAuth", () => {
    let crossmintAuth: CrossmintAuth;
    const mockCrossmint = { projectId: "test-project-id" };
    const mockApiClient = {
        baseUrl: "https://api.crossmint.com",
        get: vi.fn(),
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

    describe("refreshAuthMaterial", () => {
        it("should throw an error when refresh token is missing and no custom route is set", async () => {
            await expect(
                (crossmintAuth as any).refreshAuthMaterial()
            ).rejects.toThrow("Refresh token missing from parameters");
        });

        it("should call refresh method when refresh token is provided", async () => {
            const refreshSpy = vi.spyOn(crossmintAuth as any, "refresh").mockResolvedValue({
                jwt: "test-jwt",
                refreshToken: "test-refresh-token",
                user: { id: "user-id" }
            });
            
            await (crossmintAuth as any).refreshAuthMaterial("test-refresh-token");
            
            expect(refreshSpy).toHaveBeenCalledWith("test-refresh-token");
        });

        it("should call refreshFromCustomRoute when custom route is set", async () => {
            const customRouteAuth = CrossmintAuth.from(
                mockCrossmint as unknown as Crossmint, 
                { refreshRoute: "https://custom-route.com/refresh" }
            );
            
            const refreshCustomSpy = vi.spyOn(customRouteAuth as any, "refreshFromCustomRoute").mockResolvedValue({
                jwt: "test-jwt",
                refreshToken: "test-refresh-token",
                user: { id: "user-id" }
            });
            
            await (customRouteAuth as any).refreshAuthMaterial("test-refresh-token");
            
            expect(refreshCustomSpy).toHaveBeenCalledWith("test-refresh-token");
        });
    });

    describe("refresh", () => {
        it("should call the API client with correct parameters", async () => {
            mockApiClient.post.mockResolvedValue({
                ok: true,
                json: async () => ({
                    jwt: "test-jwt",
                    refresh: "test-refresh-token",
                    user: { id: "user-id" }
                })
            });

            const result = await (crossmintAuth as any).refresh("test-refresh-token");

            expect(mockApiClient.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({ refresh: "test-refresh-token" }),
                    headers: { "Content-Type": "application/json" }
                })
            );
            expect(result).toEqual({
                jwt: "test-jwt",
                refreshToken: "test-refresh-token",
                user: { id: "user-id" }
            });
        });

        it("should throw an error when the API response is not ok", async () => {
            mockApiClient.post.mockResolvedValue({
                ok: false,
                statusText: "Unauthorized"
            });

            await expect(
                (crossmintAuth as any).refresh("test-refresh-token")
            ).rejects.toThrow("Unauthorized");
        });
    });

    describe("refreshFromCustomRoute", () => {
        it("should throw an error when custom refresh route is not set", async () => {
            await expect(
                (crossmintAuth as any).refreshFromCustomRoute("test-refresh-token")
            ).rejects.toThrow("Custom refresh route is not set");
        });

        it("should fetch from the custom route when set", async () => {
            const customRouteAuth = CrossmintAuth.from(
                mockCrossmint as unknown as Crossmint, 
                { refreshRoute: "https://custom-route.com/refresh" }
            );
            
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    jwt: "test-jwt",
                    refreshToken: "test-refresh-token",
                    user: { id: "user-id" }
                })
            });

            const result = await (customRouteAuth as any).refreshFromCustomRoute("test-refresh-token");

            expect(global.fetch).toHaveBeenCalledWith(
                "https://custom-route.com/refresh",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({ refresh: "test-refresh-token" }),
                    headers: { "Content-Type": "application/json" }
                })
            );
            expect(result).toEqual({
                jwt: "test-jwt",
                refreshToken: "test-refresh-token",
                user: { id: "user-id" }
            });
        });

        it("should throw an error when the custom route response is not ok", async () => {
            const customRouteAuth = CrossmintAuth.from(
                mockCrossmint as unknown as Crossmint, 
                { refreshRoute: "https://custom-route.com/refresh" }
            );
            
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({ message: "Authentication failed" })
            });

            await expect(
                (customRouteAuth as any).refreshFromCustomRoute("test-refresh-token")
            ).rejects.toThrow("Authentication failed");
        });
    });

    describe("logoutFromDefaultRoute", () => {
        it("should call the API client with correct parameters", async () => {
            mockApiClient.post.mockResolvedValue({ ok: true });

            await (crossmintAuth as any).logoutFromDefaultRoute("test-refresh-token");

            expect(mockApiClient.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    body: JSON.stringify({ refresh: "test-refresh-token" }),
                    headers: { "Content-Type": "application/json" }
                })
            );
        });
    });

    describe("defaultApiClient", () => {
        it("should create a new CrossmintApiClient with the correct parameters", () => {
            CrossmintAuth.defaultApiClient(mockCrossmint as unknown as Crossmint);
            
            expect(CrossmintApiClient).toHaveBeenCalledWith(
                mockCrossmint,
                expect.objectContaining({
                    internalConfig: expect.anything()
                })
            );
        });
    });
});
