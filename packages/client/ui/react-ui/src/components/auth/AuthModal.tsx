import { Dialog, Transition } from "@headlessui/react";
import { type CSSProperties, Fragment, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { CrossmintInternalEvents } from "@crossmint/client-sdk-base";
import type { AuthMaterial } from "@crossmint/common-sdk-auth";

import X from "../../icons/x";

const authMaterialSchema = z.object({
    oneTimeSecret: z.string(),
});

const incomingModalIframeEvents = {
    authMaterialFromAuthFrame: authMaterialSchema,
};

type IncomingModalIframeEventsType = {
    authMaterialFromAuthFrame: typeof incomingModalIframeEvents.authMaterialFromAuthFrame;
};

type AuthModalProps = {
    setModalOpen: (open: boolean) => void;
    apiKey: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterial>;
    baseUrl: string;
    appearance?: UIConfig;
};

export default function AuthModal({ setModalOpen, apiKey, fetchAuthMaterial, baseUrl, appearance }: AuthModalProps) {
    let iframeSrc = `${baseUrl}sdk/2024-09-26/auth/frame?apiKey=${apiKey}`;
    if (appearance != null) {
        // The appearance object is serialized into a query parameter
        iframeSrc += `&uiConfig=${encodeURIComponent(JSON.stringify(appearance))}`;
    }

    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const iframeWindowRef = useRef<IFrameWindow<IncomingModalIframeEventsType, Record<string, never>> | null>(null);

    const [iframeChildrenHeight, setIframeChildrenHeight] = useState(0);
    const iframePaddingTopPX = 48;
    const iframePaddingBottomPX = 32;
    const paddingOffset = iframePaddingTopPX + iframePaddingBottomPX;

    const setupIframeWindowListener = () => {
        if (iframeWindowRef.current == null) {
            return;
        }

        iframeWindowRef.current.on("authMaterialFromAuthFrame", (data) => {
            fetchAuthMaterial(data.oneTimeSecret);
            iframeWindowRef.current?.off("authMaterialFromAuthFrame");
            setModalOpen(false);
        });
    };

    const handleIframeLoaded = async () => {
        if (iframeRef.current == null) {
            // The iframe should be load, here we should log on DD if possible
            console.error("Something wrong happened, please try again");
            return;
        }

        if (iframeWindowRef.current == null) {
            const initIframe = await IFrameWindow.init(iframeRef.current, {
                incomingEvents: incomingModalIframeEvents,
                outgoingEvents: {},
            });

            iframeWindowRef.current = initIframe;
            setupIframeWindowListener();
        }
    };

    useEffect(() => {
        function _onEvent(event: MessageEvent) {
            if (event.data.type === CrossmintInternalEvents.UI_HEIGHT_CHANGED) {
                setIframeChildrenHeight(event.data.payload.height);
            }
        }
        window.addEventListener("message", _onEvent);
        return () => {
            window.removeEventListener("message", _onEvent);
        };
    }, []);

    return (
        <Transition.Root show as={Fragment}>
            <Dialog as="div" style={styles.dialog} onClose={() => setModalOpen(false)}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-400"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-400"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div style={styles.transitionBegin} />
                </Transition.Child>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-400"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-400"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <div style={styles.transitionEnd} onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: "relative", width: "100%" }}>
                            <button
                                type="button"
                                aria-label="Close"
                                style={{
                                    width: "1.5rem",
                                    position: "absolute",
                                    right: "1.5rem",
                                    top: "1.5rem",
                                    cursor: "pointer",
                                    color: appearance?.colors?.border ?? "#909ca3",
                                    outlineOffset: "4px",
                                    borderRadius: "100%",
                                }}
                                onClick={() => setModalOpen(false)}
                            >
                                <X />
                            </button>
                        </div>
                        <iframe
                            ref={iframeRef}
                            src={iframeSrc}
                            onLoad={handleIframeLoaded}
                            title="Authentication Modal"
                            style={{
                                width: "100%",
                                minHeight: "300px",
                                border: "1px solid",
                                borderColor: appearance?.colors?.border ?? "#D0D5DD",
                                borderRadius: appearance?.borderRadius ?? "16px",
                                backgroundColor: appearance?.colors?.background ?? "white",
                                height: iframeChildrenHeight + paddingOffset,
                                paddingTop: iframePaddingTopPX,
                                paddingBottom: iframePaddingBottomPX,
                            }}
                        />
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition.Root>
    );
}

const styles: { [key: string]: CSSProperties } = {
    dialog: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflowY: "auto",
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
    },
    transitionBegin: {
        background: "rgba(139, 151, 151, 0.2)",
        backdropFilter: "blur(2px)",
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        transitionProperty: "opacity",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        transitionDuration: "300ms",
        zIndex: -10,
    },
    transitionEnd: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "448px",
        borderRadius: "0.75rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        zIndex: 30,
    },
};
