import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthMaterial } from "@crossmint/common-sdk-auth";
import { type CrossmintAuthService, getJWTExpiration } from "@crossmint/client-sdk-auth";
import { queueTask } from "@crossmint/client-sdk-base";

import * as authCookies from "../utils/authCookies";
import { useRefreshToken } from "./useRefreshToken";

vi.mock("@crossmint/client-sdk-auth", () => ({
    CrossmintAuthService: vi.fn(),
    getJWTExpiration: vi.fn(),
}));

vi.mock("../utils/authCookies", () => ({
    getCookie: vi.fn(),
    REFRESH_TOKEN_PREFIX: "crossmint-refresh-token",
}));

vi.mock("@crossmint/client-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/client-sdk-base");
    return {
        ...actual,
        queueTask: vi.fn(),
    };
});

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
                logout: vi.fn(),
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
            user: {
                id: "123",
                email: "test@test.com",
            },
        };

        vi.mocked(authCookies.getCookie).mockReturnValue(mockRefreshToken);
        vi.mocked(mockCrossmintAuthService.refreshAuthMaterial).mockResolvedValue(mockAuthMaterial);
        vi.mocked(getJWTExpiration).mockReturnValue(Date.now() / 1000 + 3600); // 1 hour from now

        renderHook(() =>
            useRefreshToken({
                crossmintAuthService: mockCrossmintAuthService,
                setAuthMaterial: mockSetAuthMaterial,
                logout: vi.fn(),
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
            user: {
                id: "123",
                email: "test@test.com",
            },
        };

        vi.mocked(authCookies.getCookie).mockReturnValue(mockRefreshToken);
        vi.mocked(mockCrossmintAuthService.refreshAuthMaterial).mockResolvedValue(mockAuthMaterial);
        vi.mocked(getJWTExpiration).mockReturnValue(Date.now() / 1000 + 3600); // 1 hour from now

        renderHook(() =>
            useRefreshToken({
                crossmintAuthService: mockCrossmintAuthService,
                setAuthMaterial: mockSetAuthMaterial,
                logout: vi.fn(),
            })
        );

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(vi.mocked(queueTask)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(queueTask)).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
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
                logout: vi.fn(),
            })
        );

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(console.error).toHaveBeenCalledWith(mockError);
        expect(mockSetAuthMaterial).not.toHaveBeenCalled();
    });
});
