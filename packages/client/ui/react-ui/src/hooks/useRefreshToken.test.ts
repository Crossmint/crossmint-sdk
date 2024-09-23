import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CrossmintAuthService, getJWTExpiration } from "@crossmint/client-sdk-auth-core/client";

import * as authCookies from "../utils/authCookies";
import { AuthMaterial, useRefreshToken } from "./useRefreshToken";

vi.mock("@crossmint/client-sdk-auth-core", () => ({
    CrossmintAuthService: vi.fn(),
    getJWTExpiration: vi.fn(),
}));

vi.mock("../utils/authCookies", () => ({
    getCookie: vi.fn(),
    REFRESH_TOKEN_PREFIX: "crossmint-refresh-token",
}));

describe("useRefreshToken", () => {
    const mockCrossmintAuthService = {
        refreshAuthMaterial: vi.fn(),
    } as unknown as CrossmintAuthService;

    const mockSetAuthMaterial = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("should not refresh token if refresh token is not present", async () => {
        vi.mocked(authCookies.getCookie).mockReturnValue(undefined);

        renderHook(() =>
            useRefreshToken({
                crossmintAuthService: mockCrossmintAuthService,
                setAuthMaterial: mockSetAuthMaterial,
            })
        );

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(mockCrossmintAuthService.refreshAuthMaterial).not.toHaveBeenCalled();
        expect(mockSetAuthMaterial).not.toHaveBeenCalled();
    });

    it("should refresh token if refresh token is present", async () => {
        const mockRefreshToken = "mock-refresh-token";
        const mockAuthMaterial: AuthMaterial = {
            jwtToken: "mock-jwt-token",
            refreshToken: {
                secret: "mock-secret",
                expiresAt: "2023-04-01T00:00:00Z",
            },
        };

        vi.mocked(authCookies.getCookie).mockReturnValue(mockRefreshToken);
        vi.mocked(mockCrossmintAuthService.refreshAuthMaterial).mockResolvedValue(mockAuthMaterial);
        vi.mocked(getJWTExpiration).mockResolvedValue(Date.now() / 1000 + 3600); // 1 hour from now

        renderHook(() =>
            useRefreshToken({
                crossmintAuthService: mockCrossmintAuthService,
                setAuthMaterial: mockSetAuthMaterial,
            })
        );

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(mockCrossmintAuthService.refreshAuthMaterial).toHaveBeenCalledWith(mockRefreshToken);
        expect(mockSetAuthMaterial).toHaveBeenCalledWith(mockAuthMaterial);
    });

    it("should schedule next refresh before token expiration", async () => {
        const mockRefreshToken = "mock-refresh-token";
        const mockAuthMaterial: AuthMaterial = {
            jwtToken: "mock-jwt-token",
            refreshToken: {
                secret: "mock-secret",
                expiresAt: "2023-04-01T00:00:00Z",
            },
        };

        vi.mocked(authCookies.getCookie).mockReturnValue(mockRefreshToken);
        vi.mocked(mockCrossmintAuthService.refreshAuthMaterial).mockResolvedValue(mockAuthMaterial);
        vi.mocked(getJWTExpiration).mockResolvedValue(Date.now() / 1000 + 3600); // 1 hour from now
        vi.spyOn(window, "setTimeout");

        renderHook(() =>
            useRefreshToken({
                crossmintAuthService: mockCrossmintAuthService,
                setAuthMaterial: mockSetAuthMaterial,
            })
        );

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(setTimeout).toHaveBeenCalledTimes(1);
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3480000); // 58 minutes (3600 - 120 seconds)
    });

    it("should handle errors during token refresh", async () => {
        const mockRefreshToken = "mock-refresh-token";
        const mockError = new Error("Refresh failed");

        vi.mocked(authCookies.getCookie).mockReturnValue(mockRefreshToken);
        vi.mocked(mockCrossmintAuthService.refreshAuthMaterial).mockRejectedValue(mockError);

        renderHook(() =>
            useRefreshToken({
                crossmintAuthService: mockCrossmintAuthService,
                setAuthMaterial: mockSetAuthMaterial,
            })
        );

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(console.error).toHaveBeenCalledWith(mockError);
        expect(mockSetAuthMaterial).not.toHaveBeenCalled();
    });
});
