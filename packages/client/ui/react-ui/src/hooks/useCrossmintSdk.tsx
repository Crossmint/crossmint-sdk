import { createContext, useContext } from "react";

import {
    CrossmintApiClientCtorWithoutExpectationsParams,
    CrossmintClientSideApiClient,
    createCrossmintClientSideApiClient,
} from "@crossmint/common-sdk-base";

export interface CrossmintSdkProviderContext {
    apiClient: CrossmintClientSideApiClient;
}

const CrossmintSdkProviderContext = createContext<CrossmintSdkProviderContext | null>(null);

export function CrossmintSdkProvider({
    apiKey,
    overrideBaseUrl,
    children,
}: CrossmintApiClientCtorWithoutExpectationsParams & {
    children: React.ReactNode;
}) {
    const apiClient = createCrossmintClientSideApiClient({ apiKey, overrideBaseUrl });
    return (
        <CrossmintSdkProviderContext.Provider value={{ apiClient }}>{children}</CrossmintSdkProviderContext.Provider>
    );
}

export function useCrossmintSdk() {
    const context = useContext(CrossmintSdkProviderContext);
    if (!context) {
        throw new Error("useCrossmintSdk must be used within a CrossmintSdkProvider");
    }
    return context;
}
