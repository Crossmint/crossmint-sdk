import { useEffect, useRef, useState, useCallback } from "react";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { PopupWindow } from "@crossmint/client-sdk-window";
import { useCrossmintAuth } from "@/hooks";
import { z } from "zod";

type OAuthUrlMap = Record<OAuthProvider, string>;

export const useOAuthWindowListener = (oauthUrlMap: OAuthUrlMap, setError: (error: string | null) => void) => {
    const { crossmintAuth } = useCrossmintAuth();
    // Track which OAuth provider's window is currently being interacted with
    const [activeOAuthProvider, setActiveOAuthProvider] = useState<OAuthProvider | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const popupRef = useRef<PopupWindow<IncomingEvents, OutgoingEvents> | null>(null);
    // Every click claims the next id. Because all flows share one named popup, each resumption
    // point below has to check it still holds the claim before touching the popup or the state.
    const flowIdRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            cleanupRef.current?.();
            cleanupRef.current = null;
            // Nothing is left to adopt this popup, so abort the flow instead of leaving a window
            // on screen that no longer has a listener to close it.
            popupRef.current?.window?.close();
            popupRef.current = null;
        };
    }, []);

    const createPopupAndSetupListeners = useCallback(
        async (provider: OAuthProvider, providerLoginHint?: string) => {
            // Claim the flow before the first await.
            const flowId = ++flowIdRef.current;
            const ownsPopup = () => flowIdRef.current === flowId && mountedRef.current;

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
                popupRef.current = popup;

                const prefetchedUrl = oauthUrlMap[provider];
                const resolvedUrl = prefetchedUrl || (await crossmintAuth?.getOAuthUrl(provider));
                if (resolvedUrl == null) {
                    throw new Error("Failed to resolve OAuth URL");
                }
                baseUrl = new URL(resolvedUrl);
            } catch (e) {
                if (ownsPopup()) {
                    popup?.window?.close();
                    setActiveOAuthProvider(null);
                    setError(e instanceof Error ? e.message : "Failed to start OAuth login");
                }
                return;
            }

            // PopupWindow.initEmpty opens a named window, so the later click reused this
            // popup. Leave it to that flow rather than closing it or navigating it again.
            if (!ownsPopup()) {
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

            // Drop the previous flow's listeners only now that this one is taking the popup over.
            // Doing it before the await above would leave its still-live popup with nothing listening.
            cleanupRef.current?.();

            if (popup.window != null) {
                popup.window.location.href = baseUrl.toString();
            }

            // Listen on the popup itself: it is the window that sends these events, and its
            // transport drops anything from another sender. Every flow wraps the same reused
            // window in its own client, so the takeover above is what keeps one pair alive.
            const handleAuthMaterial = async (data: { oneTimeSecret: string }) => {
                await crossmintAuth?.handleRefreshAuthMaterial(data.oneTimeSecret);
                if (!ownsPopup()) {
                    return;
                }
                cleanup();
                popup.window?.close();
                setActiveOAuthProvider(null);
            };

            const handleError = (data: { error: string }) => {
                if (!ownsPopup()) {
                    return;
                }
                setError(data.error);
                cleanup();
                popup.window?.close();
                setActiveOAuthProvider(null);
            };

            const authMaterialListenerId = popup.on("authMaterialFromPopupCallback", handleAuthMaterial);
            const errorListenerId = popup.on("errorFromPopupCallback", handleError);
            // Add a check for manual window closure
            // Ideally we should find a more explicit way of doing this, but I think this is fine for now.
            // The listeners deliberately stay registered: a callback page posts its secret and then closes
            // itself, so tearing them down here would drop material that is already in flight. Takeover
            // and unmount both remove them, so at most one pair is ever alive.
            const checkWindowClosure = setInterval(() => {
                if (popup.window?.closed) {
                    clearInterval(checkWindowClosure);
                    if (ownsPopup()) {
                        setActiveOAuthProvider(null);
                    }
                }
            }, 2500); // Check every 2.5 seconds

            const cleanup = () => {
                clearInterval(checkWindowClosure);
                popup.off(authMaterialListenerId);
                popup.off(errorListenerId);
            };
            cleanupRef.current = cleanup;
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
