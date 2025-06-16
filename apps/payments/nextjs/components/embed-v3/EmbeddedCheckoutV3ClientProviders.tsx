import { CrossmintCheckoutProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import type { ReactNode } from "react";

export function EmbeddedCheckoutV3ClientProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            overrideBaseUrl="https://dserver.maxf.io"
            apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? ""}
            appId="embedded-checkout-v3-test"
        >
            <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
