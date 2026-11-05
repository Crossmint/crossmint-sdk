import { cookies } from "next/headers";
import { createCrossmint, CrossmintAuth, getAuthCookieNames, validateAPIKey } from "@crossmint/server-sdk";

export async function getAuthSession(refreshRoute?: string) {
    // Read cookies first: it makes the page dynamic even when the API key below is missing
    const cookieStore = await cookies();

    const apiKey = process.env.SERVER_CROSSMINT_API_KEY || "";
    const apiKeyResult = validateAPIKey(apiKey);
    if (!apiKeyResult.isValid) {
        return;
    }

    // Server Components have no request object, so read the project-scoped cookies by name
    const cookieNames = getAuthCookieNames(apiKeyResult.projectId);
    const jwt = cookieStore.get(cookieNames.jwt)?.value;
    const refreshToken = cookieStore.get(cookieNames.refreshToken)?.value;

    if (!refreshToken) {
        return;
    }

    try {
        const crossmintAuth = CrossmintAuth.from(createCrossmint({ apiKey }), {
            refreshRoute,
        });
        return await crossmintAuth.getSession({
            jwt,
            refreshToken,
        });
    } catch (_) {
        return;
    }
}
