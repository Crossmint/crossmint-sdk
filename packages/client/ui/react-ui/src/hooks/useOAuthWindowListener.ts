import { useEffect, useRef, useState, useCallback } from "react";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { ChildWindow, PopupWindow } from "@crossmint/client-sdk-window";
import { useCrossmintAuth } from "@/hooks";
import { z } from "zod";

type OAuthUrlMap = Record<OAuthProvider, string>;

export const useOAuthWindowListener = (oauthUrlMap: OAuthUrlMap, setError: (error: string | null) => void) => {
    const { crossmintAuth } = useCrossmintAuth();
    // Track which OAuth provider's window is currently being interacted with
    const [activeOAuthProvider, setActiveOAuthProvider] = useState<OAuthProvider | null>(null);
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
            setActiveOAuthProvider(provider);
            setError(null);

            let popup: PopupWindow<IncomingEvents, OutgoingEvents> | undefined;
            let baseUrl: URL;
            try {
                // Open the popup synchronously with a blank URL so it isn't blocked by the popup blocker,
                // then resolve the OAuth URL (using the prefetched value if present) and navigate the popup.
                popup = PopupWindow.initEmpty<IncomingEvents, OutgoingEvents>({
                    crossOrigin: true,
                    width: 400,
                    height: 700,
                    incomingEvents,
                });

                const prefetchedUrl = oauthUrlMap[provider];
                const resolvedUrl = prefetchedUrl || (await crossmintAuth?.getOAuthUrl(provider));
                if (resolvedUrl == null) {
                    throw new Error("Failed to resolve OAuth URL");
                }
                baseUrl = new URL(resolvedUrl);
            } catch (e) {
                popup?.window?.close();
                setActiveOAuthProvider(null);
                setError(e instanceof Error ? e.message : "Failed to start OAuth login");
                return;
            }

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

            if (popup.window != null) {
                popup.window.location.href = baseUrl.toString();
            }

            const handleAuthMaterial = async (data: { oneTimeSecret: string }) => {
                await crossmintAuth?.handleRefreshAuthMaterial(data.oneTimeSecret);
                childRef.current?.off("authMaterialFromPopupCallback");
                popup.window?.close();
                setActiveOAuthProvider(null);
            };

            const handleError = (data: { error: string }) => {
                setError(data.error);
                childRef.current?.off("errorFromPopupCallback");
                popup.window?.close();
                setActiveOAuthProvider(null);
            };

            childRef.current.on("authMaterialFromPopupCallback", handleAuthMaterial);
            childRef.current.on("errorFromPopupCallback", handleError);
            // Add a check for manual window closure
            // Ideally we should find a more explicit way of doing this, but I think this is fine for now.
            const checkWindowClosure = setInterval(() => {
                if (popup.window?.closed) {
                    clearInterval(checkWindowClosure);
                    setActiveOAuthProvider(null);
                    childRef.current?.off("authMaterialFromPopupCallback");
                }
            }, 2500); // Check every 2.5 seconds
        },
        [oauthUrlMap, crossmintAuth, setError]
    );

    return {
        createPopupAndSetupListeners,
        isLoading: activeOAuthProvider != null,
        activeOAuthProvider,
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
