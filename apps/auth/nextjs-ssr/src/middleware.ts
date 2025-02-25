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

    // Ensure cookies are not httpOnly for direct API approach
    const jwt = request.cookies.get("crossmint-jwt")?.value;
    const refreshToken = request.cookies.get("crossmint-refresh-token")?.value;

    if (!refreshToken) {
        return response;
    }

    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint);

        const { jwt: newJwt, refreshToken: newRefreshToken } = await crossmintAuth.getSession({
            jwt,
            refreshToken,
        });

        // Only update response cookies if tokens have changed
        if (newJwt !== jwt || newRefreshToken.secret !== refreshToken) {
            response.cookies.set("crossmint-jwt", newJwt);
            response.cookies.set("crossmint-refresh-token", newRefreshToken.secret);
        }
    } catch (_) {
        // If auth fails, clear cookies and redirect to home
        response.cookies.delete("crossmint-jwt");
        response.cookies.delete("crossmint-refresh-token");
    }

    return response;
}
