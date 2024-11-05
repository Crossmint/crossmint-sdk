import { CrossmintCheckoutProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import type { ReactNode } from "react";

export function HostedCheckoutV3ClientProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            overrideBaseUrl="https://dserver.maxf.io"
            apiKey="ck_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuTQKmeRbn1gv7zYCoZrRNYy4CnM7A3AMHQxFKA2BsSVeZbKEvXXY7126Th68mXhTg6oxHJpC2kuw9Q1HasVLX9LM67FoYSTRtTUUEzP93GUSEmeG5CZG7Lbop4oAQ7bmZUKTGmqN9L9wxP27CH13WaTBsrqxUJkojbKUXEd"
        >
            <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
