import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    CrossmintAuthenticationError,
    type AuthMaterialBasic,
    type AuthMaterial,
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

export function setAuthCookies(response: GenericResponse, authMaterial: AuthMaterial) {
    const cookies = [
        createCookieString({ name: SESSION_PREFIX, value: authMaterial.jwt }),
        createCookieString({
            name: REFRESH_TOKEN_PREFIX,
            value: authMaterial.refreshToken.secret,
            expiresAt: authMaterial.refreshToken.expiresAt,
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
        throw new CrossmintAuthenticationError("Cookie header not found");
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

function createCookieString(cookieOptions: CookieOptions): string {
    const expiresInUtc = cookieOptions.expiresAt ? new Date(cookieOptions.expiresAt).toUTCString() : "";
    let cookieString = `${cookieOptions.name}=${cookieOptions.value}; path=/; SameSite=Lax;`;
    if (expiresInUtc) {
        cookieString += ` expires=${expiresInUtc};`;
    }
    return cookieString;
}
