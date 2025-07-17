import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";

import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import { useAuthForm } from "./AuthFormProvider";
import { useOAuthWindowListener } from "@/hooks/useOAuthWindowListener";

type OAuthUrlMap = Record<OAuthProvider, string>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: "",
    twitter: "",
};

interface OAuthFlowContextType {
    startOAuthLogin: (provider: OAuthProvider, providerLoginHint?: string) => Promise<void>;
    isLoading: boolean;
}

const OAuthFlowContext = createContext<OAuthFlowContextType | undefined>(undefined);

export function useOAuthFlow() {
    const context = useContext(OAuthFlowContext);
    if (!context) {
        throw new Error("useOAuthFlow must be used within an OAuthFlowProvider");
    }
    return context;
}

export function OAuthFlowProvider({ children }: { children: ReactNode }) {
    const { crossmintAuth, loginMethods } = useCrossmintAuth();
    const { setError } = useAuthForm();

    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    const { createPopupAndSetupListeners, isLoading: isLoadingOAuthWindow } = useOAuthWindowListener(
        oauthUrlMap,
        setError
    );

    const preFetchAndSetOauthUrl = useCallback(async () => {
        setIsLoadingOauthUrlMap(true);
        try {
            const oauthProviders = (loginMethods || []).filter(
                (method): method is OAuthProvider => method in initialOAuthUrlMap
            );
            const oauthPromiseList = oauthProviders.map(async (provider) => {
                const url = await crossmintAuth?.getOAuthUrl(provider);
                return { [provider]: url };
            });
            const urlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
            setOauthUrlMap(urlMap);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to load oauth providers. Please try again later.");
        } finally {
            setIsLoadingOauthUrlMap(false);
        }
    }, [loginMethods, crossmintAuth, setError]);

    useEffect(() => {
        preFetchAndSetOauthUrl();
    }, [preFetchAndSetOauthUrl]);

    const startOAuthLogin = useCallback(
        async (provider: OAuthProvider, providerLoginHint?: string) => {
            await createPopupAndSetupListeners(provider, providerLoginHint);
        },
        [createPopupAndSetupListeners]
    );

    const value: OAuthFlowContextType = {
        startOAuthLogin,
        isLoading: isLoadingOauthUrlMap || isLoadingOAuthWindow,
    };

    return <OAuthFlowContext.Provider value={value}>{children}</OAuthFlowContext.Provider>;
}
