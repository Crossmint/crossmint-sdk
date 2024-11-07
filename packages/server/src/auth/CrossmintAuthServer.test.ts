import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintAuthServer } from "./CrossmintAuthServer";
import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { type AuthMaterialBasic, CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";
import * as cookiesUtils from "./utils/cookies";
import * as jwtUtils from "./utils/jwt";
import type { GenericRequest, GenericResponse } from "./types/request";
import type { ServerResponse } from "http";

vi.mock("@crossmint/common-sdk-base");
vi.mock("./utils/cookies");
vi.mock("./utils/jwt");

describe("CrossmintAuthServer", () => {
    let crossmintAuthServer: CrossmintAuthServer;
    const mockCrossmint = { projectId: "test-project-id" };
    const mockApiClient = {
        baseUrl: "https://api.crossmint.com",
        get: vi.fn(),
        post: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(CrossmintApiClient).mockReturnValue(mockApiClient as unknown as CrossmintApiClient);
        crossmintAuthServer = CrossmintAuthServer.from(mockCrossmint as unknown as Crossmint);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("from", () => {
        it("should create a new CrossmintAuthServer instance", () => {
            expect(crossmintAuthServer).toBeInstanceOf(CrossmintAuthServer);
            expect(CrossmintApiClient).toHaveBeenCalledWith(mockCrossmint, expect.any(Object));
        });
    });

    describe("verifyCrossmintJwt", () => {
        it("should call verifyCrossmintJwt with correct parameters", async () => {
            const mockToken = "mock.jwt.token";
            const mockDecodedJwt = { sub: "user123" };
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue(mockDecodedJwt);

            const result = await crossmintAuthServer.verifyCrossmintJwt(mockToken);

            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenCalledWith(
                mockToken,
                "https://api.crossmint.com/.well-known/jwks.json"
            );
            expect(result).toBe(mockDecodedJwt);
        });
    });

    describe("getSession", () => {
        const originalConsoleError = console.error;
        const mockRequest = { headers: { cookie: "mock-cookie" } };
        const mockAuthMaterial = {
            jwt: "mock.jwt.token",
            refreshToken: "mock-refresh-token",
        };

        beforeEach(() => {
            console.error = vi.fn();
        });

        afterEach(() => {
            console.error = originalConsoleError;
        });

        it("should return a valid session when JWT is valid", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue({ sub: "user123" });

            const result = await crossmintAuthServer.getSession(mockRequest as GenericRequest);

            expect(result).toEqual({
                jwt: "mock.jwt.token",
                refreshToken: {
                    secret: "mock-refresh-token",
                    expiresAt: "",
                },
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
                        refresh: {
                            secret: "new-refresh-token",
                            expiresAt: "2023-12-31T23:59:59Z",
                        },
                        user: { id: "user456" },
                    }),
                ok: true,
            });

            const result = await crossmintAuthServer.getSession(mockRequest as GenericRequest);

            expect(result).toEqual({
                jwt: "new.jwt.token",
                refreshToken: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                userId: "user456",
            });
            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/refresh",
                expect.any(Object)
            );
        });

        it("should accept AuthMaterialBasic as input", async () => {
            const mockAuthMaterial = {
                jwt: "mock.jwt.token",
                refreshToken: "mock-refresh-token",
            };
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue({ sub: "user123" });

            const result = await crossmintAuthServer.getSession(mockAuthMaterial);

            expect(result).toEqual({
                jwt: "mock.jwt.token",
                refreshToken: {
                    secret: "mock-refresh-token",
                    expiresAt: "",
                },
                userId: "user123",
            });
        });

        it("should call logout when error occurs and response is provided", async () => {
            const mockRequest = { headers: { cookie: "mock-cookie" } } as GenericRequest;
            const mockResponse = {} as GenericResponse;

            vi.spyOn(CrossmintAuthServer.prototype, "logout");
            crossmintAuthServer = CrossmintAuthServer.from(mockCrossmint as unknown as Crossmint);

            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue({
                jwt: "mock.jwt.token",
                refreshToken: "mock-refresh-token",
            } as AuthMaterialBasic);

            vi.mocked(jwtUtils.verifyCrossmintJwt).mockRejectedValue(new Error("Invalid token"));
            mockApiClient.post.mockRejectedValueOnce(new CrossmintAuthenticationError("API error"));

            await expect(crossmintAuthServer.getSession(mockRequest, mockResponse)).rejects.toThrow(
                CrossmintAuthenticationError
            );

            expect(CrossmintAuthServer.prototype.logout).toHaveBeenCalledWith(mockRequest, mockResponse);
        });

        it("should throw CrossmintAuthenticationError when refresh token is not found", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue({ jwt: "mock.jwt.token" } as AuthMaterialBasic);

            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                CrossmintAuthenticationError
            );
            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                "Refresh token not found"
            );
        });

        it("should throw CrossmintAuthenticationError when session retrieval fails", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockRejectedValue(new Error("Invalid token"));
            mockApiClient.post.mockRejectedValue(new Error("API error"));

            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                CrossmintAuthenticationError
            );
            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                "Failed to get session"
            );
        });
    });

    describe("getUser", () => {
        it("should fetch user data for a given external user ID", async () => {
            const mockExternalUserId = "external-user-123";
            const mockUserData = { id: "user456", email: "user@example.com" };
            mockApiClient.get.mockResolvedValue({
                json: () => Promise.resolve(mockUserData),
            });

            const result = await crossmintAuthServer.getUser(mockExternalUserId);

            expect(result).toEqual(mockUserData);
            expect(mockApiClient.get).toHaveBeenCalledWith(
                `api/2024-09-26/sdk/auth/user/${mockExternalUserId}`,
                expect.any(Object)
            );
        });
    });

    describe("storeAuthMaterial", () => {
        it("should call setAuthCookies with the provided response and auth material", () => {
            const mockResponse = {} as GenericResponse;
            const mockAuthMaterial = {
                jwt: "new.jwt.token",
                refreshToken: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
            };

            crossmintAuthServer.storeAuthMaterial(mockResponse, mockAuthMaterial);

            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(mockResponse, mockAuthMaterial, {});
        });
    });

    describe("handleCustomRefresh", () => {
        it("should handle Fetch-based refresh requests", async () => {
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({ refresh: "mock-refresh-token" }),
            });

            const mockRefreshedAuthRes = {
                jwt: "new.jwt.token",
                refresh: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                user: { id: "user123" },
            };

            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve(mockRefreshedAuthRes),
                ok: true,
            });

            const result = await crossmintAuthServer.handleCustomRefresh(mockRequest);

            expect(result).toBeInstanceOf(Response);
            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/refresh",
                expect.any(Object)
            );

            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                expect.any(Response),
                {
                    jwt: mockRefreshedAuthRes.jwt,
                    refreshToken: mockRefreshedAuthRes.refresh,
                    user: mockRefreshedAuthRes.user,
                },
                {}
            );
        });

        it("should handle Fetch-based refresh errors and clear cookies", async () => {
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({ refresh: "mock-refresh-token" }),
            });

            mockApiClient.post.mockRejectedValue(new Error("API error"));

            const result = (await crossmintAuthServer.handleCustomRefresh(mockRequest)) as Response;
            expect(result.statusText).toBe("Unauthorized");
            expect(result.status).toBe(401);

            // Verify auth cookies were cleared with the correct structure
            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                expect.any(Response),
                {
                    jwt: "",
                    refreshToken: {
                        secret: "",
                        expiresAt: "",
                    },
                },
                {}
            );
        });

        it("should throw error when refresh token is missing", async () => {
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = (await crossmintAuthServer.handleCustomRefresh(mockRequest)) as Response;

            expect(response.status).toBe(401);
            const body = await response.json();
            expect(body).toEqual({
                error: "Unauthorized",
                message: "Please provide a refresh token either in the request body or cookies",
            });
        });

        it("should handle Node-based refresh requests", async () => {
            const { mockNodeRequest, mockNodeResponse } = getNodeReqResMock();

            const mockRefreshedAuthRes = {
                jwt: "new.jwt.token",
                refresh: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                user: { id: "user123" },
            };

            mockApiClient.post.mockResolvedValue({
                json: () => Promise.resolve(mockRefreshedAuthRes),
                ok: true,
            });

            const mockRefreshedAuth = {
                jwt: mockRefreshedAuthRes.jwt,
                refreshToken: mockRefreshedAuthRes.refresh,
                user: mockRefreshedAuthRes.user,
            };

            const result = await crossmintAuthServer.handleCustomRefresh(mockNodeRequest, mockNodeResponse);

            expect(mockNodeResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
            expect(mockNodeResponse.write).toHaveBeenCalledWith(JSON.stringify(mockRefreshedAuth));

            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                mockNodeResponse,
                expect.objectContaining({
                    jwt: "new.jwt.token",
                    refreshToken: {
                        secret: "new-refresh-token",
                        expiresAt: "2023-12-31T23:59:59Z",
                    },
                }),
                {}
            );

            expect(result).toBe(mockNodeResponse);
        });

        it("should handle Node-based refresh errors", async () => {
            const { mockNodeRequest, mockNodeResponse } = getNodeReqResMock();

            mockApiClient.post.mockRejectedValue(new Error("API error"));

            await crossmintAuthServer.handleCustomRefresh(mockNodeRequest, mockNodeResponse);

            expect(mockNodeResponse.statusCode).toBe(401);
            expect(mockNodeResponse.write).toHaveBeenCalledWith(
                JSON.stringify({ error: "Unauthorized", message: "API error" })
            );

            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                mockNodeResponse,
                expect.objectContaining({
                    jwt: "",
                    refreshToken: {
                        secret: "",
                        expiresAt: "",
                    },
                }),
                {}
            );
        });
    });

    describe("logout", () => {
        const mockRequest = { headers: { cookie: "mock-cookie" } } as GenericRequest;

        beforeEach(() => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue({
                jwt: "mock.jwt.token",
                refreshToken: "mock-refresh-token",
            });
        });

        it("should clear auth material from response and return it", async () => {
            const mockResponse = {} as GenericResponse;

            const result = await crossmintAuthServer.logout(undefined, mockResponse);

            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                mockResponse,
                {
                    jwt: "",
                    refreshToken: {
                        secret: "",
                        expiresAt: "",
                    },
                },
                {}
            );
            expect(result).toBe(mockResponse);
        });

        it("should create and return new Response when no response provided", async () => {
            const result = await crossmintAuthServer.logout();

            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                expect.any(Response),
                {
                    jwt: "",
                    refreshToken: {
                        secret: "",
                        expiresAt: "",
                    },
                },
                {}
            );
            expect(result).toBeInstanceOf(Response);
        });

        it("should attempt to call logout endpoint when request is provided", async () => {
            mockApiClient.post.mockResolvedValue({ ok: true });

            await crossmintAuthServer.logout(mockRequest);

            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/logout",
                expect.objectContaining({
                    body: JSON.stringify({ refresh: "mock-refresh-token" }),
                })
            );
        });

        it("should still clear cookies even if logout endpoint call fails", async () => {
            const mockResponse = {} as GenericResponse;
            mockApiClient.post.mockRejectedValue(new Error("API Error"));
            const consoleSpy = vi.spyOn(console, "error");

            const result = await crossmintAuthServer.logout(mockRequest, mockResponse);

            expect(consoleSpy).toHaveBeenCalled();
            expect(cookiesUtils.setAuthCookies).toHaveBeenCalledWith(
                mockResponse,
                {
                    jwt: "",
                    refreshToken: {
                        secret: "",
                        expiresAt: "",
                    },
                },
                {}
            );
            expect(result).toBe(mockResponse);
        });
    });
});

function getNodeReqResMock() {
    const mockNodeRequest = {
        method: "POST",
        on: (event: string, callback: (chunk: Buffer) => void) => {
            if (event === "data") {
                callback(Buffer.from(JSON.stringify({ refresh: "mock-refresh-token" })));
            } else if (event === "end") {
                callback(Buffer.from(""));
            }
            return mockNodeRequest;
        },
        httpVersion: "1.1",
    } as unknown as GenericRequest;

    const mockNodeResponse = {
        setHeader: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        statusCode: 200,
        getHeader: vi.fn(),
    } as unknown as ServerResponse;

    return { mockNodeRequest, mockNodeResponse };
}
