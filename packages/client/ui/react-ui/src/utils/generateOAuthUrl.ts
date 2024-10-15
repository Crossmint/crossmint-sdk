import type { OAuthProvider } from "@/types/auth";

export async function generateOAuthUrl(provider: OAuthProvider, apiKey: string, baseUrl: string): Promise<string> {
    const stytchPublicToken = await fetchStytchPublicToken(baseUrl, apiKey);
    const redirectUrl = buildRedirectUrl(baseUrl, provider, apiKey);
    const stytchDomain = getStytchDomain(baseUrl);
    return buildOAuthUrl(stytchDomain, provider, stytchPublicToken, redirectUrl);
}

async function fetchStytchPublicToken(baseUrl: string, apiKey: string): Promise<string> {
    try {
        const response = await fetch(
            `${baseUrl}api/2024-09-26/session/sdk/auth/stytch-public-token?${new URLSearchParams({ apiKey })}`
        );
        const data = await response.json();
        return data.stytchPublicToken;
    } catch (error) {
        console.error("Error fetching stytch public token", error);
        return "";
    }
}

function buildRedirectUrl(baseUrl: string, provider: OAuthProvider, apiKey: string): string {
    const redirectCallbackUrl = `${baseUrl}sdk/2024-09-26/auth/callback`;
    return `${baseUrl}api/2024-09-26/session/sdk/auth/authenticate?${new URLSearchParams({
        callbackUrl: redirectCallbackUrl,
        signinAuthenticationMethod: provider,
        apiKey,
    })}`;
}

function getStytchDomain(baseUrl: string): string {
    return baseUrl.includes("localhost") ? "test.stytch.com" : "api.stytch.com";
}

function buildOAuthUrl(
    stytchDomain: string,
    provider: OAuthProvider,
    stytchPublicToken: string,
    redirectUrl: string
): string {
    return `https://${stytchDomain}/v1/public/oauth/${provider}/start?${new URLSearchParams({
        public_token: stytchPublicToken,
        login_redirect_url: redirectUrl,
        signup_redirect_url: redirectUrl,
    })}`;
}
