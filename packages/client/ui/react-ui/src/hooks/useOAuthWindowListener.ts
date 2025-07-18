import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { ChildWindow, PopupWindow } from "@crossmint/client-sdk-window";
import { useEffect, useRef, useState, useCallback } from "react";
import { z } from "zod";
import { useCrossmintAuth } from "./useCrossmintAuth";

type OAuthUrlMap = Record<OAuthProvider, string>;

export const useOAuthWindowListener = (oauthUrlMap: OAuthUrlMap, setError: (error: string | null) => void) => {
    const { crossmintAuth } = useCrossmintAuth();
    const [isLoading, setIsLoading] = useState(false);
    const childRef = useRef<ChildWindow<IncomingEvents, OutgoingEvents> | null>(null);

    useEffect(() => {
        if (childRef.current == null) {
            childRef.current = new ChildWindow<IncomingEvents, OutgoingEvents>(window.opener || window.parent, "*", {
                incomingEvents,
            });
        }

        return () => {
            if (childRef.current != null) {
                childRef.current.off("authMaterialFromPopupCallback");
            }
        };
    }, []);

    const createPopupAndSetupListeners = useCallback(
        async (provider: OAuthProvider, providerLoginHint?: string) => {
            if (childRef.current == null) {
                throw new Error("Child window not initialized");
            }
            setIsLoading(true);
            setError(null);

            console.log("oauthUrlMap:", oauthUrlMap);
            console.log("provider:", provider);
            console.log("oauthUrlMap[provider]:", oauthUrlMap[provider]);
            console.log("providerLoginHint:", providerLoginHint);
            const baseUrl = new URL(oauthUrlMap[provider]);

            // The provider_login_hint is a parameter that can be used to pre-fill the email field of the OAuth provider to allow auto-login if session exists.
            // Stytch Docs: https://stytch.com/docs/api/oauth-google-start#additional-provider-parameters
            if (providerLoginHint != null) {
                // Clear existing params but save them
                const existingParams = Array.from(baseUrl.searchParams.entries());
                baseUrl.search = "";

                // Add provider_login_hint first
                if (providerLoginHint) {
                    baseUrl.searchParams.append("provider_login_hint", providerLoginHint);
                }

                // Add all other params after
                existingParams.forEach(([key, value]) => {
                    baseUrl.searchParams.append(key, value);
                });
            }

            const popup = await PopupWindow.init(baseUrl.toString(), {
                awaitToLoad: false,
                crossOrigin: true,
                width: 400,
                height: 700,
            });

            const handleAuthMaterial = async (data: { oneTimeSecret: string }) => {
                await crossmintAuth?.handleRefreshAuthMaterial(data.oneTimeSecret);
                childRef.current?.off("authMaterialFromPopupCallback");
                popup.window.close();
                setIsLoading(false);
            };

            const handleError = (data: { error: string }) => {
                setError(data.error);
                childRef.current?.off("errorFromPopupCallback");
                popup.window.close();
                setIsLoading(false);
            };

            childRef.current.on("authMaterialFromPopupCallback", handleAuthMaterial);
            childRef.current.on("errorFromPopupCallback", handleError);
            // Add a check for manual window closure
            // Ideally we should find a more explicit way of doing this, but I think this is fine for now.
            const checkWindowClosure = setInterval(() => {
                if (popup.window?.closed) {
                    clearInterval(checkWindowClosure);
                    setIsLoading(false);
                    childRef.current?.off("authMaterialFromPopupCallback");
                }
            }, 2500); // Check every 2.5 seconds
        },
        [oauthUrlMap, crossmintAuth, setError]
    );

    return {
        createPopupAndSetupListeners,
        isLoading,
    };
};

const incomingEvents = {
    authMaterialFromPopupCallback: z.object({ oneTimeSecret: z.string() }),
    errorFromPopupCallback: z.object({ error: z.string() }),
};

type IncomingEvents = {
    authMaterialFromPopupCallback: typeof incomingEvents.authMaterialFromPopupCallback;
    errorFromPopupCallback: typeof incomingEvents.errorFromPopupCallback;
};

type OutgoingEvents = Record<string, never>;
