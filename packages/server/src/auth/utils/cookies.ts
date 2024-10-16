import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    CrossmintAuthenticationError,
    type AuthMaterialBasic,
} from "@crossmint/common-sdk-auth";
import type { IncomingMessage } from "http";
import { type GenericRequest, isNodeRequest, isFetchRequest } from "../types/request";

export function getAuthCookies(request: GenericRequest): AuthMaterialBasic {
    const cookieHeader = getCookieHeader(request);
    const { [SESSION_PREFIX]: jwt, [REFRESH_TOKEN_PREFIX]: refreshToken } = parseCookieHeader(cookieHeader);
    return { jwt, refreshToken };
}

function getCookieHeader(request: GenericRequest): string {
    let cookieHeader: string;

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
