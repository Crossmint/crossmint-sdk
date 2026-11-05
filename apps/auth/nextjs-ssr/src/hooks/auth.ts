import { cookies } from "next/headers";
import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";

export async function getAuthSession(refreshRoute?: string) {
    try {
        const crossmint = createCrossmint({
            apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
        });
        const crossmintAuth = CrossmintAuth.from(crossmint, {
            refreshRoute,
        });

        // Server Components have no request object, so read the project-scoped cookies by name
        const cookieStore = await cookies();
        const cookieNames = crossmintAuth.getAuthCookieNames();
        const jwt = cookieStore.get(cookieNames.jwt)?.value;
        const refreshToken = cookieStore.get(cookieNames.refreshToken)?.value;

        if (!refreshToken) {
            return;
        }

        return await crossmintAuth.getSession({
            jwt,
            refreshToken,
        });
    } catch (_) {
        return;
    }
}
