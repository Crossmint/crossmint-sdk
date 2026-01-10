import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatusAPIResponse } from "@farcaster/auth-kit";
import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { AUTH_SDK_ROOT_ENDPOINT, type AuthMaterialWithUser } from "@crossmint/common-sdk-auth";
import { CrossmintAuthClient } from "./CrossmintAuthClient";
import * as cookiesUtils from "./utils/cookies";
import { queueTask } from "@crossmint/client-sdk-base";
import { getJWTExpiration } from "./utils";

vi.mock("@crossmint/common-sdk-base");
vi.mock("./utils/cookies");
vi.mock("@crossmint/client-sdk-base");

function createMockJWT(expirationTimestamp?: number): string {
    const exp = expirationTimestamp || Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const header = {
        alg: "HS256",
        typ: "JWT",
    };
    const payload = {
        sub: "test-user-id",
        iat: Math.floor(Date.now() / 1000),
        exp,
        iss: "crossmint",
    };

    const encodeBase64URL = (obj: any) => {
        const jsonString = JSON.stringify(obj);
        const base64 = btoa(jsonString);
        return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };

    const encodedHeader = encodeBase64URL(header);
    const encodedPayload = encodeBase64URL(payload);
    const signature = "mock-signature-that-is-base64url-safe";
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

describe("CrossmintAuthClient", () => {
    let crossmintAuthClient: CrossmintAuthClient;
    const validJwt = createMockJWT();
    const mockCrossmint = { projectId: "test-project-id" };
    const mockApiClient = {
        baseUrl: "https://api.crossmint.com",
        get: vi.fn(),
        post: vi.fn(),
    };
    const mockCallbacks = {
        onLogout: vi.fn(),
        onTokenRefresh: vi.fn(),
    };
    const mockConfig = {
        callbacks: mockCallbacks,
        refreshRoute: "http://example.com/custom/refresh",
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(CrossmintApiClient).mockReturnValue(mockApiClient as unknown as CrossmintApiClient);
        crossmintAuthClient = CrossmintAuthClient.from(mockCrossmint as unknown as Crossmint, mockConfig);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("from", () => {
        it("should create a new CrossmintAuthClient instance with config", () => {
            expect(crossmintAuthClient).toBeInstanceOf(CrossmintAuthClient);
            expect(CrossmintApiClient).toHaveBeenCalledWith(mockCrossmint, expect.any(Object));
            expect((crossmintAuthClient as any).callbacks).toEqual(mockConfig.callbacks);
            expect((crossmintAuthClient as any).refreshRoute).toBe(mockConfig.refreshRoute);
        });
    });

    describe("getUser", () => {
        it("should fetch user data", async () => {
            const mockUserData = { id: "user123", email: "user@example.com" };
            mockApiClient.get.mockResolvedValue({
                json: () => Promise.resolve(mockUserData),
                ok: true,
            });

            const result = await crossmintAuthClient.getUser();

            expect(result).toEqual(mockUserData);
            expect(mockApiClient.get).toHaveBeenCalledWith("api/2024-09-26/sdk/auth/user", expect.any(Object));
        });
    });

    describe("storeAuthMaterial", () => {
        it("should store auth material in cookies", async () => {
            const mockAuthMaterial: AuthMaterialWithUser = {
                jwt: validJwt,
                refreshToken: { secret: "refresh-token", expiresAt: "2023-12-31T23:59:59Z" },
                user: { id: "user123" },
            };

            await crossmintAuthClient.storeAuthMaterial(mockAuthMaterial);

            // Cookie names are scoped by project ID (defaults to "default" when apiKey is missing or invalid)
            expect(cookiesUtils.setCookie).toHaveBeenCalledWith(
                "crossmint-jwt-default",
                mockAuthMaterial.jwt,
                new Date(getJWTExpiration(validJwt)! * 1000).toISOString()
            );
            expect(cookiesUtils.setCookie).toHaveBeenCalledWith(
                "crossmint-refresh-token-default",
                mockAuthMaterial.refreshToken.secret,
                mockAuthMaterial.refreshToken.expiresAt
            );
        });
    });

    describe("logout", () => {
        beforeEach(() => {
            mockApiClient.post.mockReset();
        });

        it("should call logout endpoint, clear auth cookies and call onLogout callback", async () => {
            const mockCallbacks = { onLogout: vi.fn() };
            const mockRefreshToken = "mock-refresh-token";
            vi.mocked(cookiesUtils.getCookie).mockReturnValue(mockRefreshToken);
            crossmintAuthClient = CrossmintAuthClient.from(mockCrossmint as unknown as Crossmint, {
                callbacks: mockCallbacks,
            });

            await crossmintAuthClient.logout();

            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/logout",
                expect.objectContaining({
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        refresh: mockRefreshToken,
                    }),
                })
            );
            expect(cookiesUtils.deleteCookie).toHaveBeenCalledWith("crossmint-refresh-token");
            expect(cookiesUtils.deleteCookie).toHaveBeenCalledWith("crossmint-jwt");
            expect(mockCallbacks.onLogout).toHaveBeenCalled();
        });

        it("should call custom logout route when configured", async () => {
            const mockCallbacks = { onLogout: vi.fn() };
            const customLogoutRoute = "/custom/logout";
            const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

            crossmintAuthClient = CrossmintAuthClient.from(mockCrossmint as unknown as Crossmint, {
                callbacks: mockCallbacks,
                logoutRoute: customLogoutRoute,
            });

            await crossmintAuthClient.logout();

            expect(fetchSpy).toHaveBeenCalledWith(customLogoutRoute, { method: "POST" });
            expect(mockApiClient.post).not.toHaveBeenCalled();
            expect(cookiesUtils.deleteCookie).toHaveBeenCalledWith("crossmint-refresh-token");
            expect(cookiesUtils.deleteCookie).toHaveBeenCalledWith("crossmint-jwt");
            expect(mockCallbacks.onLogout).toHaveBeenCalled();
        });
    });

    describe("handleRefreshAuthMaterial", () => {
        const mockRefreshToken = "mock-refresh-token";
        const mockAuthMaterial = {
            jwt: validJwt,
            refreshToken: { secret: "new-refresh-token", expiresAt: "2023-12-31T23:59:59Z" },
            user: { id: "user123" },
        };

        beforeEach(() => {
            vi.spyOn(crossmintAuthClient as any, "refreshAuthMaterial").mockResolvedValue(mockAuthMaterial);
            vi.spyOn(crossmintAuthClient as any, "storeAuthMaterial").mockImplementation(() => {});
            vi.mocked(queueTask).mockReturnValue({ cancel: vi.fn() } as any);
            (crossmintAuthClient as any).refreshPromise = null;
        });

        it("should refresh auth material and schedule next refresh", async () => {
            crossmintAuthClient = CrossmintAuthClient.from(mockCrossmint as unknown as Crossmint, {
                callbacks: mockCallbacks,
            });
            vi.spyOn(crossmintAuthClient as any, "refreshAuthMaterial").mockResolvedValue(mockAuthMaterial);
            vi.spyOn(crossmintAuthClient as any, "storeAuthMaterial").mockImplementation(() => {});

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(crossmintAuthClient["refreshAuthMaterial"]).toHaveBeenCalledWith(mockRefreshToken);
            expect(crossmintAuthClient["storeAuthMaterial"]).toHaveBeenCalledWith(mockAuthMaterial);
            expect(queueTask).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
        });

        it("should not refresh when called twice in a row", async () => {
            const promise1 = crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);
            const promise2 = crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            await Promise.all([promise1, promise2]);

            expect(crossmintAuthClient["refreshAuthMaterial"]).toHaveBeenCalledTimes(1);
        });

        it("should call onTokenRefresh callback if provided", async () => {
            const mockCallback = vi.fn();
            (crossmintAuthClient as any).callbacks.onTokenRefresh = mockCallback;

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(mockCallback).toHaveBeenCalledWith(mockAuthMaterial);
        });

        it("should handle errors and call logout", async () => {
            const mockError = new Error("Refresh failed");
            vi.spyOn(crossmintAuthClient as any, "refreshAuthMaterial").mockRejectedValue(mockError);
            vi.spyOn(crossmintAuthClient, "logout").mockImplementation(() => Promise.resolve());
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(consoleErrorSpy).toHaveBeenCalledWith(mockError);
            expect(crossmintAuthClient.logout).toHaveBeenCalled();
        });

        it("should use cookie if no refresh token is provided", async () => {
            vi.mocked(cookiesUtils.getCookie).mockReturnValue(mockRefreshToken);

            await crossmintAuthClient.handleRefreshAuthMaterial();

            expect(crossmintAuthClient["refreshAuthMaterial"]).toHaveBeenCalledWith(mockRefreshToken);
        });

        it("should not refresh if no refresh token is available and no custom refresh route is set", async () => {
            crossmintAuthClient = CrossmintAuthClient.from(mockCrossmint as unknown as Crossmint, {});
            vi.spyOn(crossmintAuthClient as any, "refreshAuthMaterial").mockResolvedValue(mockAuthMaterial);
            vi.mocked(cookiesUtils.getCookie).mockReturnValue(null as any);

            await crossmintAuthClient.handleRefreshAuthMaterial();

            expect(crossmintAuthClient["refreshAuthMaterial"]).not.toHaveBeenCalled();
        });

        it("should cancel previous refresh task before scheduling a new one", async () => {
            const mockCancelTask = vi.fn();
            (crossmintAuthClient as any).refreshTask = { cancel: mockCancelTask };

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(mockCancelTask).toHaveBeenCalled();
            expect(queueTask).toHaveBeenCalled();
        });

        it("should not schedule refresh if JWT is invalid", async () => {
            vi.spyOn(crossmintAuthClient as any, "refreshAuthMaterial").mockResolvedValue(null);
            vi.spyOn(crossmintAuthClient, "logout").mockImplementation(() => Promise.resolve());

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(crossmintAuthClient.logout).toHaveBeenCalled();
            expect(queueTask).not.toHaveBeenCalled();
        });

        it("should not schedule refresh if time to expire is negative", async () => {
            vi.spyOn(crossmintAuthClient as any, "refreshAuthMaterial").mockResolvedValue(null);
            vi.spyOn(crossmintAuthClient, "logout").mockImplementation(() => Promise.resolve());

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(queueTask).not.toHaveBeenCalled();
        });

        it("should not store auth material if custom refresh route is set", async () => {
            const spyStoreAuthMaterial = vi.spyOn(crossmintAuthClient, "storeAuthMaterial");

            await crossmintAuthClient.handleRefreshAuthMaterial(mockRefreshToken);

            expect(crossmintAuthClient["refreshAuthMaterial"]).toHaveBeenCalledWith(mockRefreshToken);
            expect(spyStoreAuthMaterial).not.toHaveBeenCalled();
        });
    });

    describe("getOAuthUrl", () => {
        it("should fetch OAuth URL for a given provider", async () => {
            const mockProvider = "google";
            const mockOAuthUrl = "https://oauth.example.com/auth";
            mockApiClient.get.mockResolvedValue({
                json: () => Promise.resolve({ oauthUrl: mockOAuthUrl }),
                ok: true,
            });

            const result = await crossmintAuthClient.getOAuthUrl(mockProvider);

            expect(result).toBe(mockOAuthUrl);
            expect(mockApiClient.get).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/social/google/start",
                expect.any(Object)
            );
        });
    });

    describe("sendEmailOtp", () => {
        it("should send email OTP", async () => {
            const mockEmail = "user@example.com";
            const mockResponse = { success: true };
            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve(mockResponse),
                ok: true,
            });

            const result = await crossmintAuthClient.sendEmailOtp(mockEmail);

            expect(result).toEqual(mockResponse);
            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/otps/send",
                expect.objectContaining({
                    body: JSON.stringify({ email: mockEmail }),
                })
            );
        });
    });

    describe("confirmEmailOtp", () => {
        it("should confirm email OTP and return oneTimeSecret", async () => {
            const mockEmail = "user@example.com";
            const mockEmailId = "email-id-123";
            const mockToken = "otp-token-456";
            const mockOneTimeSecret = "one-time-secret-789";
            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve({ oneTimeSecret: mockOneTimeSecret }),
                ok: true,
            });

            const result = await crossmintAuthClient.confirmEmailOtp(mockEmail, mockEmailId, mockToken);

            expect(result).toBe(mockOneTimeSecret);
            expect(mockApiClient.post).toHaveBeenCalledWith(
                expect.stringContaining("api/2024-09-26/session/sdk/auth/authenticate"),
                expect.any(Object)
            );
        });
    });

    describe("signInWithFarcaster", () => {
        it("should sign in with Farcaster and return oneTimeSecret", async () => {
            const mockFarcasterData = {
                message: "mock-message",
                signature: "mock-signature",
                signatureParams: { domain: "example.com" },
            };
            const mockOneTimeSecret = "farcaster-one-time-secret-123";
            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve({ oneTimeSecret: mockOneTimeSecret }),
                ok: true,
            });

            const result = await crossmintAuthClient.signInWithFarcaster(mockFarcasterData as StatusAPIResponse);

            expect(result).toBe(mockOneTimeSecret);
            const expectedCallbackUrl = `https://api.crossmint.com/api/2024-09-26/session/sdk/auth/callback`;
            const queryParams = new URLSearchParams({
                signinAuthenticationMethod: "farcaster",
                callbackUrl: expectedCallbackUrl,
            });
            expect(mockApiClient.post).toHaveBeenCalledWith(
                expect.stringContaining(`api/2024-09-26/session/sdk/auth/authenticate?${queryParams}`),
                expect.objectContaining({
                    body: JSON.stringify({
                        ...mockFarcasterData,
                        domain: "example.com",
                        redirect: true,
                        callbackUrl: expectedCallbackUrl,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            );
        });
    });

    describe("signInWithSmartWallet", () => {
        it("should initiate smart wallet sign in", async () => {
            const mockAddress = "0x1234567890abcdef";
            const mockResponse = {
                message: "Please sign this message",
                nonce: "123456",
            };
            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve(mockResponse),
                ok: true,
            });

            const result = await crossmintAuthClient.signInWithSmartWallet(mockAddress, "evm");

            expect(result).toEqual(mockResponse);

            expect(mockApiClient.post).toHaveBeenCalledWith(
                `api/2024-09-26/session/sdk/auth/crypto_wallets/authenticate/start`,
                expect.objectContaining({
                    body: JSON.stringify({ walletAddress: mockAddress, walletType: "ethereum" }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            );
        });
    });

    describe("authenticateSmartWallet", () => {
        it("should complete smart wallet authentication", async () => {
            const mockAddress = "0x1234567890abcdef";
            const mockSignature = "0xsignature123";
            const mockResponse = {
                success: true,
                authMaterial: {
                    jwt: "mock.jwt.token",
                    refreshToken: { secret: "refresh-token" },
                },
            };
            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve(mockResponse),
                ok: true,
            });

            const evmResult = await crossmintAuthClient.authenticateSmartWallet(mockAddress, "evm", mockSignature);

            expect(evmResult).toEqual(mockResponse);
            const queryParams = new URLSearchParams({
                signinAuthenticationMethod: "evm",
                callbackUrl: `${mockApiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback`,
            });
            expect(mockApiClient.post).toHaveBeenCalledWith(
                `api/2024-09-26/session/sdk/auth/crypto_wallets/authenticate?${queryParams}`,
                expect.objectContaining({
                    body: JSON.stringify({
                        walletAddress: mockAddress,
                        signature: mockSignature,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            );
        });
    });
});
