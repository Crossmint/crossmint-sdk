"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { CrossmintAuthProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
const API_KEY_STAGING =
    "ck_staging_AAAtobFcvdshTgtaYda9QncMTM7XKRmrfN97ikMZoaVdtqGSU8iEyyQLaiBkgTo74tgA1hWuEy1rd6shN2bzcYG4paVdb3jdBPfTSNaPFeUKjJtmXEVq3g46D27JbccGzKsx63xzzjUhU7R4QbFaDMkVJtp6YXpe7kZSfSuniTa7aLJ1WuoFAjW8J3tg5ocqbqqfm44bxYRRB4wpAoaDjbGz";
const API_KEY_LOCAL =
    "ck_development_9oJ326ehwQMcGwsPDJ6jZUUBS2F6NVmT6cnnjoDW8B6EkPHcnk2VQJVo3xVrxyE1JAGQLhccamiPbXf2vX2Pap4RUr2fxKtBKjwz1kxtVgbroBNGL62cDJchQdaKxNMtUyRNragYmZPwhZRv1ZoFfBhsFPPTZeruxv3LWXNvkwDJ3xsV2d7QaHxC96XWSySjbSe362tAAdcfD9BM6fs3HtYY";

export function Providers({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <CrossmintProvider apiKey={API_KEY_LOCAL}>
                <CrossmintAuthProvider
                    embeddedWallets={{
                        createOnLogin: "all-users",
                        type: "evm-smart-wallet",
                        defaultChain: "polygon-amoy",
                    }}
                    appearance={{
                        borderRadius: "16px",
                        colors: {
                            inputBackground: "#FAF5EC",
                            buttonBackground: "#E9E3D8",
                            border: "#835911",
                            background: "#FAF5EC",
                            textPrimary: "#704130",
                            textSecondary: "#835911",
                            danger: "#ff3333",
                            accent: "#602C1B",
                        },
                    }}
                    loginMethods={["google", "email", "farcaster"]}
                >
                    {children}
                </CrossmintAuthProvider>
            </CrossmintProvider>
        </QueryClientProvider>
    );
}
