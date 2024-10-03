"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { CrossmintAuthProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";

export function Providers({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <CrossmintProvider apiKey={"ck_development_5ZWkfMR1mdtMkcKGTuP6oi2sJkyozzhhH1KeH1XWAfRQYEWVmChGoHq1z3q8YN4J2387QRzVHFciW2h69h93GpjppJJKk5KM3W85oLLzN2cQhjVfm6dqsLo292Ci3AaBAxoamVaJ6FeBMsCB8AFVjkLqbFWKvGEDaTqytHbHjPB6SJFr3KJ9S6ZqTJg1wiLT5EXWGHT5Sufef12hfT9tWr2S"}>
                <CrossmintAuthProvider
                    embeddedWallets={{
                        createOnLogin: "all-users",
                        type: "evm-smart-wallet",
                        defaultChain: "polygon-amoy",
                    }}
                    appearance={{
                        spacingUnit: "8px",
                        borderRadius: "12px",
                        colors: {
                            inputBackground: "#fffdf9",
                            buttonBackground: "#fffaf2",
                            border: "#835911",
                            background: "#FAF5EC",
                            textPrimary: "#5f2c1b",
                            textSecondary: "#835911",
                            danger: "#ff3333",
                            accent: "#602C1B",
                        },
                    }}
                >
                    {children}
                </CrossmintAuthProvider>
            </CrossmintProvider>
        </QueryClientProvider>
    );
}
