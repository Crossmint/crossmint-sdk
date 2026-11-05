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
 * Read the session from the request cookies. If either project-scoped cookie (`crossmint-jwt-<projectId>`,
 * as the client SDK writes it) is present, both come from the scoped names; otherwise both come from the legacy
 * bare names. The two are never mixed, so a legacy JWT is never paired with a scoped refresh token.
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
    const jwt = cookies[names.jwt] || undefined;
    const refreshToken = cookies[names.refreshToken] || undefined;
    if (jwt != null || refreshToken != null) {
        return { jwt, refreshToken } as AuthMaterialBasic;
    }
    return {
        jwt: cookies[SESSION_PREFIX] || undefined,
        refreshToken: cookies[REFRESH_TOKEN_PREFIX] || undefined,
    } as AuthMaterialBasic;
}

/**
 * Write the session to the response cookies under the project-scoped names. Empty auth material (logout)
 * also expires the legacy bare-named cookies, so an old session cannot be read back through the fallback.
 * A refresh leaves them alone: they may belong to another project on the same domain.
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
        ...(authMaterial.jwt === ""
            ? [SESSION_PREFIX, REFRESH_TOKEN_PREFIX].map((legacyName) =>
                  createCookieString({ name: legacyName, value: "", options })
              )
            : []),
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
