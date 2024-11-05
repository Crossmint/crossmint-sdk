import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    CrossmintAuthenticationError,
    type AuthMaterialBasic,
    type AuthMaterial,
    type CookieData,
    type CookieOptions,
} from "@crossmint/common-sdk-auth";
import {
    type GenericRequest,
    isNodeRequest,
    isFetchRequest,
    type GenericResponse,
    isNodeResponse,
    isFetchResponse,
} from "../types/request";

export function getAuthCookies(request: GenericRequest): AuthMaterialBasic {
    const cookieHeader = getCookieHeader(request);
    const { [SESSION_PREFIX]: jwt, [REFRESH_TOKEN_PREFIX]: refreshToken } = parseCookieHeader(cookieHeader);
    return { jwt, refreshToken };
}

export function setAuthCookies(response: GenericResponse, authMaterial: AuthMaterial, options?: CookieOptions) {
    const cookies = [
        createCookieString({
            name: SESSION_PREFIX,
            value: authMaterial.jwt,
            options: {
                ...options,
                // The JWT needs to be accessible to the browser for the client SDK to work
                httpOnly: false,
            },
        }),
        createCookieString({
            name: REFRESH_TOKEN_PREFIX,
            value: authMaterial.refreshToken.secret,
            options: {
                ...options,
                expiresAt: authMaterial.refreshToken.expiresAt,
            },
        }),
    ];

    if (isNodeResponse(response)) {
        response.setHeader("Set-Cookie", cookies);
    } else if (isFetchResponse(response)) {
        cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
    } else {
        throw new CrossmintAuthenticationError("Unsupported response type");
    }
}

function getCookieHeader(request: GenericRequest): string {
    let cookieHeader;

    if (isNodeRequest(request)) {
        cookieHeader = request.headers.cookie;
    } else if (isFetchRequest(request)) {
        cookieHeader = request.headers.get("Cookie");
    } else {
        throw new CrossmintAuthenticationError("Unsupported request type");
    }

    if (cookieHeader == null) {
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
