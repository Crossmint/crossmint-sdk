import type { ReactNode } from "react";
import { AuthKitProvider } from "@farcaster/auth-kit";

/**
 * @deprecated Farcaster authentication is deprecated and will be removed in a future release.
 */
export function FarcasterProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
    const config = {
        rpcUrl: "https://mainnet.optimism.io",
        domain: new URL(baseUrl).hostname.replace(/^www\./, ""),
        siweUri: `${baseUrl}api/2024-09-26/session/sdk/auth/authenticate`,
    };

    return <AuthKitProvider config={config}>{children}</AuthKitProvider>;
}
