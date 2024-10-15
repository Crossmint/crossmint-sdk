import type { OAuthProvider } from "@/types/auth";

export function generateOAuthUrl(provider: OAuthProvider, apiKey: string, baseUrl: string) {
    const redirectCallbackUrl = `${baseUrl}sdk/2024-09-26/auth/callback`;

    const redirectUrl = `${baseUrl}api/2024-09-26/session/sdk/auth/authenticate?${new URLSearchParams({
        callbackUrl: redirectCallbackUrl,
        signinAuthenticationMethod: provider,
        apiKey,
    }).toString()}`;

    const stytchDomain = baseUrl.includes("localhost") ? "test.stytch.com" : "api.stytch.com";

    const oauthUrl = `https://${stytchDomain}/v1/public/oauth/${provider}/start?${new URLSearchParams({
        public_token: "add <NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN> here",
        login_redirect_url: redirectUrl,
        signup_redirect_url: redirectUrl,
    }).toString()}`;

    return oauthUrl;
}
