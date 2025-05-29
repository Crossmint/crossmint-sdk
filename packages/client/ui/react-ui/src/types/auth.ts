export type { CrossmintAuthEmbeddedWallets } from "@crossmint/client-sdk-react-base";

export type OtpEmailPayload = {
    email: string;
    emailId: string;
};

export type LoginMethod = "email" | "google" | "farcaster" | "twitter" | "web3" | "web3:evm-only" | "web3:solana-only";
export type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";
