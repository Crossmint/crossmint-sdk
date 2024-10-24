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
        expect(() => getAuthCookies(mockRequest)).toThrow("Cookie header not found");
    });

    it("should throw CrossmintAuthenticationError if cookie header is missing in Fetch Request", () => {
        const mockRequest = new Request("https://example.com");

        expect(() => getAuthCookies(mockRequest)).toThrow(CrossmintAuthenticationError);
        expect(() => getAuthCookies(mockRequest)).toThrow("Cookie header not found");
    });

    it("should throw CrossmintAuthenticationError for unsupported request type", () => {
        const mockRequest = {} as any;

        expect(() => getAuthCookies(mockRequest)).toThrow(CrossmintAuthenticationError);
        expect(() => getAuthCookies(mockRequest)).toThrow("Unsupported request type");
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

        setAuthCookies(mockResponse, mockAuthMaterial);

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

        setAuthCookies(mockResponse, mockAuthMaterial);

        expect(appendSpy).toHaveBeenCalledTimes(2);
        expect(appendSpy).toHaveBeenCalledWith("Set-Cookie", `${SESSION_PREFIX}=mock-jwt-token; path=/; SameSite=Lax;`);
        expect(appendSpy).toHaveBeenCalledWith(
            "Set-Cookie",
            `${REFRESH_TOKEN_PREFIX}=mock-refresh-token; path=/; SameSite=Lax; expires=Sat, 01 Apr 2023 00:00:00 GMT;`
        );
    });

    it("should throw CrossmintAuthenticationError for unsupported response type", () => {
        const mockResponse = {} as any;

        expect(() => setAuthCookies(mockResponse, mockAuthMaterial)).toThrow(CrossmintAuthenticationError);
        expect(() => setAuthCookies(mockResponse, mockAuthMaterial)).toThrow("Unsupported response type");
    });
});
