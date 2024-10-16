import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncomingMessage } from "http";
import { CrossmintAuthenticationError, SESSION_PREFIX, REFRESH_TOKEN_PREFIX } from "@crossmint/common-sdk-auth";
import { getAuthCookies } from "./cookies";

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
