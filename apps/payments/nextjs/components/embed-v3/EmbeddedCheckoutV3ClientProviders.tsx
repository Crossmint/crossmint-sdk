import { CrossmintCheckoutProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import type { ReactNode } from "react";

export function EmbeddedCheckoutV3ClientProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            overrideBaseUrl="https://dserver.maxf.io"
            apiKey="ck_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuTQKmeRbn1gv7zYCoZrRNYy4CnM7A3AMHQxFKA2BsSVeZbKEvXXY7126Th68mXhTg6oxHJpC2kuw9Q1HasVLX9LM67FoYSTRtTUUEzP93GUSEmeG5CZG7Lbop4oAQ7bmZUKTGmqN9L9wxP27CH13WaTBsrqxUJkojbKUXEd"
            // apiKey="ck_staging_61iPStKPVHWHUcRxoL3TrqT6tzcBs6PkobPKYjLnhzdb4kcJDuxcqLbJjMy1unQumGbfYonNE7Ps4YzSFvaFL98cRmvTk3XTGHRi4A7v5Gy5SSMfb87z25zMSXWxTGALb5DUUgBDkKhFCz2KzYQWo57fMzE9WPszZnxuMqYCXLogi3SiKG2oXX36xvV1FX1KiBFgWPrLYM5Er3TzMbzVceRy"
        >
            <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
