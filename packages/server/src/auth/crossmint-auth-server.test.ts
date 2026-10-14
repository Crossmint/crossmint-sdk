import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintAuthServer } from "./CrossmintAuthServer";
import {
    type Crossmint,
    CrossmintApiClient,
    validateAPIKey,
    type ValidateAPIKeyResult,
} from "@crossmint/common-sdk-base";
import { type AuthMaterialBasic, CrossmintAuthenticationError } from "@crossmint/common-sdk-auth";
import { UnsecuredJWT } from "jose";
import * as cookiesUtils from "./utils/cookies";
import * as jwtUtils from "./utils/jwt";
import type { GenericRequest, GenericResponse } from "./types/request";
import type { ServerResponse } from "http";

vi.mock("@crossmint/common-sdk-base");
vi.mock("./utils/cookies");
vi.mock("./utils/jwt", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./utils/jwt")>()),
    verifyCrossmintJwt: vi.fn(),
}));

const PROJECT_ID = "test-project-id";

function jwtForProject(audience: string | string[]) {
    return new UnsecuredJWT({}).setAudience(audience).setSubject("user123").encode();
}

describe("CrossmintAuthServer", () => {
    let crossmintAuthServer: CrossmintAuthServer;
    const mockCrossmint = { projectId: PROJECT_ID, apiKey: "mock-api-key" };
    const mockApiClient = {
        baseUrl: "https://api.crossmint.com",
        get: vi.fn(),
        post: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(CrossmintApiClient).mockReturnValue(mockApiClient as unknown as CrossmintApiClient);
        vi.mocked(validateAPIKey).mockReturnValue({
            isValid: true,
            projectId: PROJECT_ID,
        } as ValidateAPIKeyResult);
        crossmintAuthServer = CrossmintAuthServer.from(mockCrossmint as unknown as Crossmint);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe("from", () => {
        it("creates a new CrossmintAuthServer instance", () => {
            expect(crossmintAuthServer).toBeInstanceOf(CrossmintAuthServer);
            expect(CrossmintApiClient).toHaveBeenCalledWith(mockCrossmint, expect.any(Object));
        });

        it("throws when the API key is invalid", () => {
            vi.mocked(validateAPIKey).mockReturnValueOnce({
                isValid: false,
                message: "bad key",
            } as ValidateAPIKeyResult);

            expect(() => CrossmintAuthServer.from(mockCrossmint as unknown as Crossmint)).toThrow("bad key");
        });
    });

    describe("verifyCrossmintJwt", () => {
        it("calls verifyCrossmintJwt with correct parameters", async () => {
            const mockToken = "mock.jwt.token";
            const mockDecodedJwt = { sub: "user123" };
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue(mockDecodedJwt);

            const result = await crossmintAuthServer.verifyCrossmintJwt(mockToken);

            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenCalledWith(
                mockToken,
                "https://api.crossmint.com/.well-known/jwks.json",
                { audience: PROJECT_ID }
            );
            expect(result).toBe(mockDecodedJwt);
        });

        it("forwards the project audience when a JWKS is provided", async () => {
            const mockToken = "mock.jwt.token";
            const mockJwks = { keys: [] };
            const mockDecodedJwt = { sub: "user123" };
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue(mockDecodedJwt);

            const result = await crossmintAuthServer.verifyCrossmintJwt(mockToken, mockJwks);

            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenCalledWith(mockToken, mockJwks, {
                audience: PROJECT_ID,
            });
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

        it("returns a valid session when JWT is valid", async () => {
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

        it("refreshes the session when JWT is invalid", async () => {
            const refreshedJwt = jwtForProject(PROJECT_ID);
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt)
                .mockRejectedValueOnce(new Error("Invalid token"))
                .mockResolvedValueOnce({ sub: "user456", aud: PROJECT_ID });
            mockApiClient.post.mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        jwt: refreshedJwt,
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
                jwt: refreshedJwt,
                refreshToken: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                userId: "user456",
            });
            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenCalledWith(
                refreshedJwt,
                "https://api.crossmint.com/.well-known/jwks.json",
                { audience: PROJECT_ID }
            );
            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/refresh",
                expect.any(Object)
            );
        });

        it("rejects and clears cookies when the refresh returns a JWT issued for another project", async () => {
            const foreignJwt = jwtForProject("other-project");
            const mockResponse = {} as GenericResponse;
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt)
                .mockRejectedValueOnce(new Error("Invalid stored JWT"))
                .mockRejectedValueOnce(new Error("JWT audience does not match the expected project"));
            mockApiClient.post.mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        jwt: foreignJwt,
                        refresh: {
                            secret: "new-refresh-token",
                            expiresAt: "2023-12-31T23:59:59Z",
                        },
                        user: { id: "user456" },
                    }),
                ok: true,
            });

            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest, mockResponse)).rejects.toThrow(
                "Failed to get session"
            );

            expect(cookiesUtils.setAuthCookies).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ jwt: foreignJwt }),
                expect.anything()
            );
            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenLastCalledWith(
                foreignJwt,
                "https://api.crossmint.com/.well-known/jwks.json",
                { audience: PROJECT_ID }
            );
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
        });

        it("rejects the session when a custom refresh JWT fails verification", async () => {
            const refreshRoute = "https://app.example.com/api/refresh";
            const mockResponse = {} as GenericResponse;
            const refreshedJwt = jwtForProject(PROJECT_ID);
            const refreshedAuthMaterial = {
                jwt: refreshedJwt,
                refreshToken: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                user: { id: "victim" },
            };
            const fetchMock = vi.fn().mockResolvedValue(
                new Response(JSON.stringify(refreshedAuthMaterial), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                })
            );
            vi.stubGlobal("fetch", fetchMock);
            crossmintAuthServer = CrossmintAuthServer.from(mockCrossmint as unknown as Crossmint, { refreshRoute });
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt)
                .mockRejectedValueOnce(new Error("Invalid stored JWT"))
                .mockRejectedValueOnce(new Error("signature verification failed"));

            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest, mockResponse)).rejects.toThrow(
                "Failed to get session"
            );

            expect(fetchMock).toHaveBeenCalledWith(refreshRoute, expect.objectContaining({ method: "POST" }));
            expect(cookiesUtils.setAuthCookies).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ jwt: refreshedJwt }),
                expect.anything()
            );
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
        });

        it("rejects a custom refresh response when the user does not match the JWT subject", async () => {
            const refreshRoute = "https://app.example.com/api/refresh";
            const mockResponse = {} as GenericResponse;
            const refreshedJwt = jwtForProject(PROJECT_ID);
            const refreshedAuthMaterial = {
                jwt: refreshedJwt,
                refreshToken: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                user: { id: "victim" },
            };
            vi.stubGlobal(
                "fetch",
                vi.fn().mockResolvedValue(
                    new Response(JSON.stringify(refreshedAuthMaterial), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    })
                )
            );
            crossmintAuthServer = CrossmintAuthServer.from(mockCrossmint as unknown as Crossmint, { refreshRoute });
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue(mockAuthMaterial);
            vi.mocked(jwtUtils.verifyCrossmintJwt)
                .mockRejectedValueOnce(new Error("Invalid stored JWT"))
                .mockResolvedValueOnce({ sub: "user456", aud: PROJECT_ID });

            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest, mockResponse)).rejects.toThrow(
                "Failed to get session"
            );

            expect(cookiesUtils.setAuthCookies).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ jwt: refreshedJwt }),
                expect.anything()
            );
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
        });

        it("accepts AuthMaterialBasic as input", async () => {
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

        it("calls logout when error occurs and response is provided", async () => {
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

        it("throws CrossmintAuthenticationError when refresh token is not found", async () => {
            vi.mocked(cookiesUtils.getAuthCookies).mockReturnValue({ jwt: "mock.jwt.token" } as AuthMaterialBasic);

            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                CrossmintAuthenticationError
            );
            await expect(crossmintAuthServer.getSession(mockRequest as GenericRequest)).rejects.toThrow(
                "Refresh token not found"
            );
        });

        it("throws CrossmintAuthenticationError when session retrieval fails", async () => {
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
        it("fetches user data for a given external user ID", async () => {
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
        it("calls setAuthCookies with the provided response and auth material", () => {
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
        it("handles Fetch-based refresh requests", async () => {
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({ refresh: "mock-refresh-token" }),
            });

            const mockRefreshedAuthRes = {
                jwt: jwtForProject(PROJECT_ID),
                refresh: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                user: { id: "user123" },
            };

            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue({ sub: "user123", aud: PROJECT_ID });
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

        it("returns 401 and does not store the JWT when the refresh returns one issued for another project", async () => {
            const foreignJwt = jwtForProject("other-project");
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({ refresh: "mock-refresh-token" }),
            });

            mockApiClient.post.mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        jwt: foreignJwt,
                        refresh: {
                            secret: "new-refresh-token",
                            expiresAt: "2023-12-31T23:59:59Z",
                        },
                        user: { id: "user123" },
                    }),
                ok: true,
            });
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockRejectedValueOnce(
                new Error("JWT audience does not match the expected project")
            );

            const result = (await crossmintAuthServer.handleCustomRefresh(mockRequest)) as Response;

            expect(result.status).toBe(401);
            expect(cookiesUtils.setAuthCookies).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ jwt: foreignJwt }),
                expect.anything()
            );
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
            expect(jwtUtils.verifyCrossmintJwt).toHaveBeenCalledWith(
                foreignJwt,
                "https://api.crossmint.com/.well-known/jwks.json",
                { audience: PROJECT_ID }
            );
        });

        it("returns 401 and does not store the JWT when verification fails", async () => {
            const refreshedJwt = jwtForProject(PROJECT_ID);
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({ refresh: "mock-refresh-token" }),
            });

            mockApiClient.post.mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        jwt: refreshedJwt,
                        refresh: {
                            secret: "new-refresh-token",
                            expiresAt: "2023-12-31T23:59:59Z",
                        },
                        user: { id: "user123" },
                    }),
                ok: true,
            });
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockRejectedValueOnce(new Error("signature verification failed"));

            const result = (await crossmintAuthServer.handleCustomRefresh(mockRequest)) as Response;

            expect(result.status).toBe(401);
            expect(cookiesUtils.setAuthCookies).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ jwt: refreshedJwt }),
                expect.anything()
            );
        });

        it("returns 401 when the refreshed user does not match the JWT subject", async () => {
            const refreshedJwt = jwtForProject(PROJECT_ID);
            const mockRequest = new Request("http://test.com", {
                method: "POST",
                body: JSON.stringify({ refresh: "mock-refresh-token" }),
            });

            mockApiClient.post.mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        jwt: refreshedJwt,
                        refresh: {
                            secret: "new-refresh-token",
                            expiresAt: "2023-12-31T23:59:59Z",
                        },
                        user: { id: "victim" },
                    }),
                ok: true,
            });
            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValueOnce({ sub: "user123", aud: PROJECT_ID });

            const result = (await crossmintAuthServer.handleCustomRefresh(mockRequest)) as Response;

            expect(result.status).toBe(401);
            expect(cookiesUtils.setAuthCookies).not.toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ jwt: refreshedJwt }),
                expect.anything()
            );
        });

        it("handles Fetch-based refresh errors and clears cookies", async () => {
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

        it("throws error when refresh token is missing", async () => {
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

        it("handles Node-based refresh requests", async () => {
            const { mockNodeRequest, mockNodeResponse } = getNodeReqResMock();

            const mockRefreshedAuthRes = {
                jwt: jwtForProject(PROJECT_ID),
                refresh: {
                    secret: "new-refresh-token",
                    expiresAt: "2023-12-31T23:59:59Z",
                },
                user: { id: "user123" },
            };

            vi.mocked(jwtUtils.verifyCrossmintJwt).mockResolvedValue({ sub: "user123", aud: PROJECT_ID });
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
                    jwt: mockRefreshedAuthRes.jwt,
                    refreshToken: {
                        secret: "new-refresh-token",
                        expiresAt: "2023-12-31T23:59:59Z",
                    },
                }),
                {}
            );

            expect(result).toBe(mockNodeResponse);
        });

        it("handles Node-based refresh errors", async () => {
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

        it("clears auth material from response and returns it", async () => {
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

        it("creates and returns new Response when no response provided", async () => {
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

        it("calls logout endpoint when request is provided", async () => {
            mockApiClient.post.mockResolvedValue({ ok: true });

            await crossmintAuthServer.logout(mockRequest);

            expect(mockApiClient.post).toHaveBeenCalledWith(
                "api/2024-09-26/session/sdk/auth/logout",
                expect.objectContaining({
                    body: JSON.stringify({ refresh: "mock-refresh-token" }),
                })
            );
        });

        it("clears cookies even if logout endpoint call fails", async () => {
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
