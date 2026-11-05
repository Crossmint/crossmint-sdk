import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

// Only run middleware on /direct routes
export const config = {
    matcher: "/direct/:path*",
    runtime: "nodejs",
};

export async function middleware(request: NextRequest) {
    // Skip middleware for API routes and static files
    if (request.nextUrl.pathname.startsWith("/api") || request.nextUrl.pathname.startsWith("/_next")) {
        return NextResponse.next();
    }

    const response = NextResponse.next();

    let crossmintAuth: CrossmintAuth;
    try {
        crossmintAuth = CrossmintAuth.from(
            createCrossmint({
                apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
            })
        );
    } catch (_) {
        return response;
    }
    const cookieNames = crossmintAuth.getAuthCookieNames();

    const jwt = request.cookies.get(cookieNames.jwt)?.value;
    const refreshToken = request.cookies.get(cookieNames.refreshToken)?.value;

    if (!refreshToken) {
        return response;
    }

    try {
        const { jwt: newJwt, refreshToken: newRefreshToken } = await crossmintAuth.getSession({
            jwt,
            refreshToken,
        });

        // Only update response cookies if tokens have changed. response.cookies.set (not raw Set-Cookie headers)
        // lets Next.js hand the refreshed cookies to Server Components in the same request.
        if (newJwt !== jwt || newRefreshToken.secret !== refreshToken) {
            response.cookies.set(cookieNames.jwt, newJwt);
            response.cookies.set(cookieNames.refreshToken, newRefreshToken.secret);
        }
    } catch (_) {
        response.cookies.delete(cookieNames.jwt);
        response.cookies.delete(cookieNames.refreshToken);
    }

    return response;
}
