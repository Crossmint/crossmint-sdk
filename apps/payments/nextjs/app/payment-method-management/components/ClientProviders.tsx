"use client";

import { CrossmintAuthProvider } from "@crossmint/client-sdk-react-ui";
import { CrossmintProvider } from "@crossmint/client-sdk-react-ui";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <CrossmintProvider apiKey="ck_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuTQKmeRbn1gv7zYCoZrRNYy4CnM7A3AMHQxFKA2BsSVeZbKEvXXY7126Th68mXhTg6oxHJpC2kuw9Q1HasVLX9LM67FoYSTRtTUUEzP93GUSEmeG5CZG7Lbop4oAQ7bmZUKTGmqN9L9wxP27CH13WaTBsrqxUJkojbKUXEd">
            <CrossmintAuthProvider>{children}</CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
