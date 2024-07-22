import { createContext, useContext } from "react";

import {
    CrossmintApiClientCtorWithoutExpectationsParams,
    CrossmintClientSideApiClient,
    createCrossmintClientSideApiClient,
} from "@crossmint/common-sdk-base";

export interface CrossmintProviderContext {
    apiClient: CrossmintClientSideApiClient;
}

const CrossmintProviderContext = createContext<CrossmintProviderContext | null>(null);

export function CrossmintProvider({
    apiKey,
    overrideBaseUrl,
    children,
}: CrossmintApiClientCtorWithoutExpectationsParams & {
    children: React.ReactNode;
}) {
    const apiClient = createCrossmintClientSideApiClient({ apiKey, overrideBaseUrl });
    return <CrossmintProviderContext.Provider value={{ apiClient }}>{children}</CrossmintProviderContext.Provider>;
}

export function useCrossmint() {
    const context = useContext(CrossmintProviderContext);
    if (!context) {
        throw new Error("useCrossmint must be used within a CrossmintProvider");
    }
    return context;
}
