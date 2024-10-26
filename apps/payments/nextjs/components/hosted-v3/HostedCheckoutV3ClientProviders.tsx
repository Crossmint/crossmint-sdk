import { CrossmintCheckoutProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import type { ReactNode } from "react";

export function HostedCheckoutV3ClientProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            overrideBaseUrl="https://dserver.maxf.io"
            apiKey="ck_development_5Nx4yZXetY5QVxJUp8kg1vaUoRvPtWUiFKQPiMqDmquohnkTJyXc1ynAw6XA6NiiGekhwtTMebDc9wbcFVS5ePxDqLFa9qkiXHuRH8n2igPAUQ9xXsyQBizWvRVdTx2Koy9s4qm8kaAiSQj4CtwiyY8EEUeAqWcsVVLAhjYCSDpViCMfqRjfM4FcnqgSieoRqaE7A4sLJVQWybnYbWJA8cXE"
        >
            <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
