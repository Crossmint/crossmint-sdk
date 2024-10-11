import type { OAuthProvider } from "@/types/auth";
import { generateOAuthUrl } from "@/utils/generateOAuthUrl";
import { ChildWindow, PopupWindow } from "@crossmint/client-sdk-window";
import type { AuthMaterial } from "@crossmint/common-sdk-auth";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

export const useOAuthWindowListener = (
    provider: OAuthProvider,
    options: {
        apiKey: string;
        baseUrl: string;
        fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterial>;
    }
) => {
    const [isLoading, setIsLoading] = useState(false);
    const childRef = useRef<ChildWindow<IncomingEvents, OutgoingEvents> | null>(null);
    const popupRef = useRef<PopupWindow<IncomingEvents, OutgoingEvents> | null>(null);

    useEffect(() => {
        if (childRef.current == null) {
            childRef.current = new ChildWindow<IncomingEvents, OutgoingEvents>(window.opener || window.parent, "*", {
                incomingEvents,
                outgoingEvents,
            });
            console.log("Child window initialized", { url: window.location.origin });
        }

        return () => {
            if (childRef.current != null) {
                childRef.current.off("authMaterialFromPopupCallback");
            }
        };
    }, []);

    const createPopupAndSetupListeners = async () => {
        if (childRef.current == null) {
            throw new Error("Child window not initialized");
        }
        setIsLoading(true);
        const popup = await PopupWindow.init(generateOAuthUrl(provider, options.apiKey, options.baseUrl), {
            awaitToLoad: false,
            crossOrigin: true,
            width: 400,
            height: 700,
        });

        popupRef.current = popup as PopupWindow<IncomingEvents, OutgoingEvents>;

        const handleAuthMaterial = (data: { oneTimeSecret: string }) => {
            options.fetchAuthMaterial(data.oneTimeSecret);
            childRef.current?.off("authMaterialFromPopupCallback");
            popup.window.close();
            setIsLoading(false);
        };

        childRef.current.on("authMaterialFromPopupCallback", handleAuthMaterial);

        // Add a check for manual window closure
        // Ideally we should find a more explicit way of doing this, but I think this is fine for now.
        const checkWindowClosure = setInterval(() => {
            if (popup.window.closed) {
                clearInterval(checkWindowClosure);
                setIsLoading(false);
                childRef.current?.off("authMaterialFromPopupCallback");
            }
        }, 2500); // Check every 2.5 seconds
    };

    return {
        createPopupAndSetupListeners,
        isLoading,
    };
};

const incomingEvents = {
    authMaterialFromPopupCallback: z.object({ oneTimeSecret: z.string() }),
};

const outgoingEvents = {
    authMaterialFromAuthFrame: z.object({ oneTimeSecret: z.string() }),
};

type IncomingEvents = {
    authMaterialFromPopupCallback: typeof incomingEvents.authMaterialFromPopupCallback;
};

type OutgoingEvents = {
    authMaterialFromAuthFrame: typeof outgoingEvents.authMaterialFromAuthFrame;
};
