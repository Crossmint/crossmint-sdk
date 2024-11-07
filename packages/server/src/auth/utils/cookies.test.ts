import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "http";
import { CrossmintAuthenticationError, SESSION_PREFIX, REFRESH_TOKEN_PREFIX } from "@crossmint/common-sdk-auth";
import { getAuthCookies, setAuthCookies } from "./cookies";

vi.mock("@crossmint/common-sdk-auth", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-auth");
    return {
        ...actual,
        CrossmintAuthenticationError: class extends Error {
            constructor(message: string) {
                super(message);
                this.name = "CrossmintAuthenticationError";
            }
        },
    };
});

describe("getAuthCookies", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should extract auth cookies from IncomingMessage", () => {
        const mockRequest = {
            headers: {
                cookie: `${SESSION_PREFIX}=mock-jwt-token; ${REFRESH_TOKEN_PREFIX}=mock-refresh-token`,
            },
            httpVersion: "1.1",
        } as IncomingMessage;

        const result = getAuthCookies(mockRequest);

        expect(result).toEqual({
            jwt: "mock-jwt-token",
            refreshToken: "mock-refresh-token",
        });
    });

    it("should extract auth cookies from Fetch Request", () => {
        const mockRequest = new Request("https://example.com", {
            headers: {
                Cookie: `${SESSION_PREFIX}=mock-jwt-token; ${REFRESH_TOKEN_PREFIX}=mock-refresh-token`,
            },
        });

        const result = getAuthCookies(mockRequest);

        expect(result).toEqual({
            jwt: "mock-jwt-token",
            refreshToken: "mock-refresh-token",
        });
    });

    it("should throw CrossmintAuthenticationError if cookie header is missing in IncomingMessage", () => {
        const mockRequest = {
            headers: {},
            httpVersion: "1.1",
        } as IncomingMessage;

        expect(() => getAuthCookies(mockRequest)).toThrow(CrossmintAuthenticationError);
        expect(() => getAuthCookies(mockRequest)).toThrow("No cookies found in request");
    });

    it("should throw CrossmintAuthenticationError if cookie header is missing in Fetch Request", () => {
        const mockRequest = new Request("https://example.com");

        expect(() => getAuthCookies(mockRequest)).toThrow(CrossmintAuthenticationError);
        expect(() => getAuthCookies(mockRequest)).toThrow("No cookies found in request");
    });
});

describe("setAuthCookies", () => {
    const mockAuthMaterial = {
        jwt: "mock-jwt-token",
        refreshToken: {
            secret: "mock-refresh-token",
            expiresAt: new Date("2023-04-01T00:00:00Z").toString(),
        },
    };

    const defaultOptions = {
        sameSite: "Lax" as const,
        secure: false,
        httpOnly: false,
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should set auth cookies for Node.js ServerResponse", () => {
        const mockResponse = {
            setHeader: vi.fn(),
        } as unknown as ServerResponse;

        setAuthCookies(mockResponse, mockAuthMaterial, defaultOptions);

        expect(mockResponse.setHeader).toHaveBeenCalledWith("Set-Cookie", [
            `${SESSION_PREFIX}=mock-jwt-token; path=/; SameSite=Lax;`,
            `${REFRESH_TOKEN_PREFIX}=mock-refresh-token; path=/; SameSite=Lax; expires=Sat, 01 Apr 2023 00:00:00 GMT;`,
        ]);
    });

    it("should set auth cookies for Fetch Response", () => {
        const mockHeaders = new Headers();
        const appendSpy = vi.spyOn(mockHeaders, "append");

        const mockResponse = {
            headers: mockHeaders,
        } as unknown as Response;

        setAuthCookies(mockResponse, mockAuthMaterial, defaultOptions);

        expect(appendSpy).toHaveBeenCalledTimes(2);
        expect(appendSpy).toHaveBeenCalledWith("Set-Cookie", `${SESSION_PREFIX}=mock-jwt-token; path=/; SameSite=Lax;`);
        expect(appendSpy).toHaveBeenCalledWith(
            "Set-Cookie",
            `${REFRESH_TOKEN_PREFIX}=mock-refresh-token; path=/; SameSite=Lax; expires=Sat, 01 Apr 2023 00:00:00 GMT;`
        );
    });

    it("should set expired cookies when setting empty auth material", () => {
        const response = new Response();
        const emptyAuthMaterial = {
            jwt: "",
            refreshToken: {
                secret: "",
                expiresAt: "",
            },
        };

        setAuthCookies(response, emptyAuthMaterial, defaultOptions);

        const cookies = Array.from(response.headers.entries())
            .filter(([key]) => key.startsWith("set-cookie"))
            .map(([_, value]) => value);
        expect(cookies).toHaveLength(2);
        expect(cookies[0]).toBe(`${SESSION_PREFIX}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 UTC;`);
        expect(cookies[1]).toBe(
            `${REFRESH_TOKEN_PREFIX}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 UTC;`
        );
    });

    it("should set cookies with custom options", () => {
        const response = new Response();
        const customOptions = {
            sameSite: "Strict" as const,
            secure: true,
            httpOnly: true,
            domain: "example.com",
        };

        setAuthCookies(response, mockAuthMaterial, customOptions);

        const cookies = Array.from(response.headers.entries())
            .filter(([key]) => key.startsWith("set-cookie"))
            .map(([_, value]) => value);
        expect(cookies).toHaveLength(2);
        expect(cookies[0]).toBe(
            `${SESSION_PREFIX}=mock-jwt-token; path=/; SameSite=Strict; Secure; Domain=example.com;`
        );
        expect(cookies[1]).toBe(
            `${REFRESH_TOKEN_PREFIX}=mock-refresh-token; path=/; SameSite=Strict; HttpOnly; Secure; Domain=example.com; expires=Sat, 01 Apr 2023 00:00:00 GMT;`
        );
    });
});
