export type OtpEmailPayload = {
    email: string;
    emailId: string;
};

export type LoginMethod = "email" | "google" | "farcaster" | "web3" | "twitter";
export type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";
