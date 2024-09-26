import { Dialog, Transition } from "@headlessui/react";
import { type CSSProperties, Fragment, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { IFrameWindow } from "@crossmint/client-sdk-window";
import type { UIConfig } from "@crossmint/common-sdk-base";

import X from "../../icons/x";
import { classNames } from "../../utils/classNames";
import type { AuthMaterial } from "@/hooks/useRefreshToken";

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
    const [iframe, setIframe] = useState<IFrameWindow<IncomingModalIframeEventsType, Record<string, never>> | null>(
        null
    );

    useEffect(() => {
        if (iframe == null) {
            return;
        }

        iframe.on("authMaterialFromAuthFrame", (data) => {
            fetchAuthMaterial(data.oneTimeSecret);
            iframe.off("authMaterialFromAuthFrame");
            setModalOpen(false);
        });

        return () => {
            if (iframe) {
                iframe.off("authMaterialFromAuthFrame");
            }
        };
    }, [iframe, fetchAuthMaterial, setModalOpen]);

    const handleIframeLoaded = async () => {
        if (iframeRef.current == null) {
            // The iframe should be load, here we should log on DD if possible
            console.error("Something wrong happened, please try again");
            return;
        }

        const initIframe = await IFrameWindow.init(iframeRef.current, {
            incomingEvents: incomingModalIframeEvents,
            outgoingEvents: {},
        });
        setIframe(initIframe);
    };

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
                            className={classNames(
                                "w-full h-[500px] border pt-12 pb-8",
                                appearance?.colors?.border
                                    ? `border-[${appearance.colors.border}]`
                                    : "border-[#D0D5DD]",
                                appearance?.borderRadius ? `rounded-[${appearance.borderRadius}]` : "rounded-2xl",
                                appearance?.colors?.background ? `bg-[${appearance.colors.background}]` : "bg-white"
                            )}
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
