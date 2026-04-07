"use client";

import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from "@crossmint/client-sdk-react-ui";

/**
 * Auth mode is configured via NEXT_PUBLIC_AUTH_MODE env var.
 *
 * Supported values:
 *   - "email"   (default) — Crossmint email/google auth, email recovery
 *   - "phone"   — Crossmint email/google auth, phone recovery
 *   - "passkey" — Crossmint email/google auth, email recovery + passkey signer on login
 *   - "jwt"     — Bring-your-own-auth via JWT (no CrossmintAuthProvider; set JWT via useWallet().setJwt)
 */
type AuthMode = "email" | "phone" | "passkey" | "jwt";

function getAuthMode(): AuthMode {
    const mode = process.env.NEXT_PUBLIC_AUTH_MODE;
    if (mode === "phone" || mode === "passkey" || mode === "jwt") return mode;
    return "email";
}

function getRecoveryConfig(mode: AuthMode) {
    if (mode === "phone") return { type: "phone" as const };
    return { type: "email" as const };
}

function getCreateOnLoginConfig(mode: AuthMode) {
    const chain = (process.env.NEXT_PUBLIC_CHAIN as any) || "base-sepolia";
    const base: any = { chain, recovery: getRecoveryConfig(mode) };
    if (mode === "passkey") {
        base.signers = [{ type: "passkey" }];
    }
    return base;
}

export function Providers({ children }: { children: React.ReactNode }) {
    const mode = getAuthMode();

    // JWT / BYOA mode — no CrossmintAuthProvider, the host app provides the JWT
    if (mode === "jwt") {
        return (
            <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY!}>
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintProvider>
        );
    }

    return (
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY!}>
            <CrossmintAuthProvider loginMethods={["email", "google"]}>
                <CrossmintWalletProvider createOnLogin={getCreateOnLoginConfig(mode)}>
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
