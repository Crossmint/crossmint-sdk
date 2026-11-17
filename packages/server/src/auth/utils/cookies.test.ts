import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "http";
import { CrossmintAuthenticationError, SESSION_PREFIX, REFRESH_TOKEN_PREFIX } from "@crossmint/common-sdk-auth";
import { getAuthCookieNames, getAuthCookies, setAuthCookies } from "./cookies";

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

const PROJECT_ID = "test-project-id";
const SCOPED_JWT = `${SESSION_PREFIX}-${PROJECT_ID}`;
const SCOPED_REFRESH = `${REFRESH_TOKEN_PREFIX}-${PROJECT_ID}`;

function fetchRequestWithCookies(cookie: string) {
    return new Request("https://example.com", { headers: { Cookie: cookie } });
}

describe("getAuthCookieNames", () => {
    it("scopes both cookie names by project ID", () => {
        expect(getAuthCookieNames(PROJECT_ID)).toEqual({
            jwt: "crossmint-jwt-test-project-id",
            refreshToken: "crossmint-refresh-token-test-project-id",
        });
    });
});

describe("getAuthCookies", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("when the cookies use the project-scoped names", () => {
        it("reads them from an IncomingMessage", () => {
            const mockRequest = {
                headers: { cookie: `${SCOPED_JWT}=scoped-jwt; ${SCOPED_REFRESH}=scoped-refresh` },
                httpVersion: "1.1",
            } as IncomingMessage;

            expect(getAuthCookies(mockRequest, PROJECT_ID)).toEqual({
                jwt: "scoped-jwt",
                refreshToken: "scoped-refresh",
            });
        });

        it("reads them from a Fetch Request", () => {
            const request = fetchRequestWithCookies(`${SCOPED_JWT}=scoped-jwt; ${SCOPED_REFRESH}=scoped-refresh`);

            expect(getAuthCookies(request, PROJECT_ID)).toEqual({
                jwt: "scoped-jwt",
                refreshToken: "scoped-refresh",
            });
        });

        it("ignores cookies scoped to another project", () => {
            const request = fetchRequestWithCookies(
                `${SESSION_PREFIX}-other-project=other-jwt; ${REFRESH_TOKEN_PREFIX}-other-project=other-refresh`
            );

            expect(getAuthCookies(request, PROJECT_ID)).toEqual({ jwt: undefined, refreshToken: undefined });
        });
    });

    describe("when only the legacy bare-named cookies are present", () => {
        it("falls back to them", () => {
            const mockRequest = {
                headers: { cookie: `${SESSION_PREFIX}=legacy-jwt; ${REFRESH_TOKEN_PREFIX}=legacy-refresh` },
                httpVersion: "1.1",
            } as IncomingMessage;

            expect(getAuthCookies(mockRequest, PROJECT_ID)).toEqual({
                jwt: "legacy-jwt",
                refreshToken: "legacy-refresh",
            });
        });
    });

    describe("when scoped and legacy cookies are mixed", () => {
        it("prefers the scoped cookie when both names are present", () => {
            const request = fetchRequestWithCookies(
                `${SESSION_PREFIX}=legacy-jwt; ${REFRESH_TOKEN_PREFIX}=legacy-refresh; ${SCOPED_JWT}=scoped-jwt; ${SCOPED_REFRESH}=scoped-refresh`
            );

            expect(getAuthCookies(request, PROJECT_ID)).toEqual({
                jwt: "scoped-jwt",
                refreshToken: "scoped-refresh",
            });
        });

        it("does not pair a legacy JWT with a scoped refresh token", () => {
            const request = fetchRequestWithCookies(`${SESSION_PREFIX}=legacy-jwt; ${SCOPED_REFRESH}=scoped-refresh`);

            expect(getAuthCookies(request, PROJECT_ID)).toEqual({
                jwt: undefined,
                refreshToken: "scoped-refresh",
            });
        });

        it("treats an empty scoped cookie as absent", () => {
            const request = fetchRequestWithCookies(
                `${SCOPED_JWT}=; ${SCOPED_REFRESH}=; ${SESSION_PREFIX}=legacy-jwt; ${REFRESH_TOKEN_PREFIX}=legacy-refresh`
            );

            expect(getAuthCookies(request, PROJECT_ID)).toEqual({
                jwt: "legacy-jwt",
                refreshToken: "legacy-refresh",
            });
        });
    });

    it("throws CrossmintAuthenticationError when cookie header is missing in IncomingMessage", () => {
        const mockRequest = {
            headers: {},
            httpVersion: "1.1",
        } as IncomingMessage;

        expect(() => getAuthCookies(mockRequest, PROJECT_ID)).toThrow(CrossmintAuthenticationError);
        expect(() => getAuthCookies(mockRequest, PROJECT_ID)).toThrow("No cookies found in request");
    });

    it("throws CrossmintAuthenticationError when cookie header is missing in Fetch Request", () => {
        const mockRequest = new Request("https://example.com");

        expect(() => getAuthCookies(mockRequest, PROJECT_ID)).toThrow(CrossmintAuthenticationError);
        expect(() => getAuthCookies(mockRequest, PROJECT_ID)).toThrow("No cookies found in request");
    });

    it("returns null when cookie header is missing and throwError is false", () => {
        expect(getAuthCookies(new Request("https://example.com"), PROJECT_ID, { throwError: false })).toBeNull();
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

    const EXPIRED = "expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    const EXPIRED_LEGACY_COOKIES = [
        `${SESSION_PREFIX}=; path=/; SameSite=Lax; ${EXPIRED}`,
        `${REFRESH_TOKEN_PREFIX}=; path=/; SameSite=Lax; ${EXPIRED}`,
    ];

    function setCookieHeaders(response: Response) {
        return Array.from(response.headers.entries())
            .filter(([key]) => key.startsWith("set-cookie"))
            .map(([_, value]) => value);
    }

    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("writes only the scoped cookies on a Node.js ServerResponse, leaving legacy cookies to other projects", () => {
        const mockResponse = {
            setHeader: vi.fn(),
        } as unknown as ServerResponse;

        setAuthCookies(mockResponse, mockAuthMaterial, PROJECT_ID, defaultOptions);

        expect(mockResponse.setHeader).toHaveBeenCalledWith("Set-Cookie", [
            `${SCOPED_JWT}=mock-jwt-token; path=/; SameSite=Lax;`,
            `${SCOPED_REFRESH}=mock-refresh-token; path=/; SameSite=Lax; expires=Sat, 01 Apr 2023 00:00:00 GMT;`,
        ]);
    });

    it("writes only the scoped cookies on a Fetch Response, leaving legacy cookies to other projects", () => {
        const response = new Response();

        setAuthCookies(response, mockAuthMaterial, PROJECT_ID, defaultOptions);

        expect(setCookieHeaders(response)).toEqual([
            `${SCOPED_JWT}=mock-jwt-token; path=/; SameSite=Lax;`,
            `${SCOPED_REFRESH}=mock-refresh-token; path=/; SameSite=Lax; expires=Sat, 01 Apr 2023 00:00:00 GMT;`,
        ]);
    });

    it("expires both the scoped and the legacy cookies when setting empty auth material", () => {
        const response = new Response();
        const emptyAuthMaterial = {
            jwt: "",
            refreshToken: {
                secret: "",
                expiresAt: "",
            },
        };

        setAuthCookies(response, emptyAuthMaterial, PROJECT_ID, defaultOptions);

        expect(setCookieHeaders(response)).toEqual([
            `${SCOPED_JWT}=; path=/; SameSite=Lax; ${EXPIRED}`,
            `${SCOPED_REFRESH}=; path=/; SameSite=Lax; ${EXPIRED}`,
            ...EXPIRED_LEGACY_COOKIES,
        ]);
    });

    it("applies custom options to the scoped cookies", () => {
        const response = new Response();
        const customOptions = {
            sameSite: "Strict" as const,
            secure: true,
            httpOnly: true,
            domain: "example.com",
        };

        setAuthCookies(response, mockAuthMaterial, PROJECT_ID, customOptions);

        expect(setCookieHeaders(response)).toEqual([
            `${SCOPED_JWT}=mock-jwt-token; path=/; SameSite=Strict; Secure; Domain=example.com;`,
            `${SCOPED_REFRESH}=mock-refresh-token; path=/; SameSite=Strict; HttpOnly; Secure; Domain=example.com; expires=Sat, 01 Apr 2023 00:00:00 GMT;`,
        ]);
    });
});
