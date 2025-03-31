import { type ReactNode, createContext, useContext, useMemo } from "react";

import { CrossmintProvider as BaseCrossmintProvider } from "@crossmint/client-sdk-react-base";
import type { Crossmint } from "@crossmint/common-sdk-base";

export interface CrossmintMobileContext {
    appId: string;
}

const CrossmintMobileContext = createContext<CrossmintMobileContext | null>(null);

export function useCrossmintMobile(missingContextMessage?: string) {
    const context = useContext(CrossmintMobileContext);
    if (context == null) {
        throw new Error(missingContextMessage ?? "useCrossmint must be used within a CrossmintProvider");
    }
    return context;
}

export function CrossmintProvider({
    children,
    apiKey,
    appId,
    overrideBaseUrl,
}: Omit<Crossmint, "jwt"> & {
    children: ReactNode;
    appId: string;
}) {
    const value = useMemo(() => ({ appId }), [appId]);

    return (
        <BaseCrossmintProvider apiKey={apiKey} overrideBaseUrl={overrideBaseUrl}>
            <CrossmintMobileContext.Provider value={value}>{children}</CrossmintMobileContext.Provider>
        </BaseCrossmintProvider>
    );
}
