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

    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint);

        // Reads the session cookies from the request and, if the session was refreshed, writes the new
        // ones to the response. If the session is invalid, it clears them.
        await crossmintAuth.getSession(request, response);
    } catch (_) {
        // Not signed in
    }

    return response;
}
