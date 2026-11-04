import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    CrossmintAuthenticationError,
    getScopedCookieName,
    type AuthMaterialBasic,
    type AuthMaterial,
    type CookieData,
    type CookieOptions,
} from "@crossmint/common-sdk-auth";
import {
    type GenericRequest,
    isNodeRequest,
    type GenericResponse,
    isNodeResponse,
    NodeRequestAdapter,
    FetchRequestAdapter,
    NodeResponseAdapter,
    FetchResponseAdapter,
} from "../types/request";

type GetCookiesOptions = { throwError?: boolean };

/** The project-scoped cookie names the client SDK stores the session under. */
export function getAuthCookieNames(projectId: string) {
    return {
        jwt: getScopedCookieName(SESSION_PREFIX, projectId),
        refreshToken: getScopedCookieName(REFRESH_TOKEN_PREFIX, projectId),
    };
}

/**
 * Read the session from the request cookies. Each cookie is read under its project-scoped name
 * (`crossmint-jwt-<projectId>`, as the client SDK writes it) first, then under its legacy bare name
 * (`crossmint-jwt`). A legacy JWT for another project fails the audience check and is refreshed.
 */
export function getAuthCookies(
    request: GenericRequest,
    projectId: string,
    options?: GetCookiesOptions
): AuthMaterialBasic | null {
    const cookieHeader = getCookieHeader(request, options);
    if (cookieHeader == null) {
        return null;
    }
    const cookies = parseCookieHeader(cookieHeader);
    const names = getAuthCookieNames(projectId);
    const read = (scopedName: string, legacyName: string) => cookies[scopedName] || cookies[legacyName] || undefined;
    return {
        jwt: read(names.jwt, SESSION_PREFIX),
        refreshToken: read(names.refreshToken, REFRESH_TOKEN_PREFIX),
    } as AuthMaterialBasic;
}

/**
 * Write the session to the response cookies under the project-scoped names, and expire the legacy
 * bare-named cookies so a stale legacy session does not outlive the scoped one.
 */
export function setAuthCookies(
    response: GenericResponse,
    authMaterial: AuthMaterial,
    projectId: string,
    options?: CookieOptions
) {
    const names = getAuthCookieNames(projectId);
    const cookies = [
        createCookieString({
            name: names.jwt,
            value: authMaterial.jwt,
            options: {
                ...options,
                // The JWT needs to be accessible to the browser for the client SDK to work
                httpOnly: false,
            },
        }),
        createCookieString({
            name: names.refreshToken,
            value: authMaterial.refreshToken.secret,
            options: {
                ...options,
                expiresAt: authMaterial.refreshToken.expiresAt,
            },
        }),
        ...[SESSION_PREFIX, REFRESH_TOKEN_PREFIX].map((legacyName) =>
            createCookieString({ name: legacyName, value: "", options })
        ),
    ];

    const responseAdapter = isNodeResponse(response)
        ? new NodeResponseAdapter(response)
        : new FetchResponseAdapter(response);

    responseAdapter.setCookies(cookies);
}

function getCookieHeader(request: GenericRequest, options?: GetCookiesOptions): string | null {
    const { throwError = true } = options ?? {};
    const requestAdapter = isNodeRequest(request) ? new NodeRequestAdapter(request) : new FetchRequestAdapter(request);

    const cookieHeader = requestAdapter.getCookieHeader();
    if (cookieHeader == null && throwError) {
        throw new CrossmintAuthenticationError("No cookies found in request");
    }

    return cookieHeader;
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
    return cookieHeader.split(";").reduce(
        (cookies, cookie) => {
            const [name, value] = cookie.trim().split("=");
            cookies[name] = value;
            return cookies;
        },
        {} as Record<string, string>
    );
}

function createCookieString({ name, value, options = {} }: CookieData): string {
    const { expiresAt, httpOnly = false, secure = false, sameSite = "lax", domain } = options;

    const cookieParts = [
        `${name}=${value}`,
        "path=/",
        `SameSite=${sameSite}`,
        httpOnly && "HttpOnly",
        secure && "Secure",
        domain && `Domain=${domain}`,
        expiresAt && `expires=${new Date(expiresAt).toUTCString()}`,
        value === "" && "expires=Thu, 01 Jan 1970 00:00:00 UTC",
    ].filter(Boolean);

    return `${cookieParts.join("; ")};`;
}
