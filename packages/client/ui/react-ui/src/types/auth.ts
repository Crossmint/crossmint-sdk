export type OAuthProvider = "google" | "farcaster" | "discord";

export interface OAuthUrlParams {
    provider: OAuthProvider;
    apiKey: string;
    baseUrl: string;
}

export type OtpEmailPayload = {
    email: string;
    state: string;
};
