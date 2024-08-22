import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { IFrameWindow } from "@crossmint/client-sdk-window";

import ActionModal from "./ActionModal";

const incomingModalIframeEvents = {
    jwtToken: z.object({
        jwtToken: z.string(),
    }),
};

const outgoingModalIframeEvents = {
    closeWindow: z.object({
        closeWindow: z.string(),
    }),
};

type IncomingModalIframeEventsType = {
    jwtToken: typeof incomingModalIframeEvents.jwtToken;
};

type OutgoingModalIframeEventsType = {
    closeWindow: typeof outgoingModalIframeEvents.closeWindow;
};

export default function AuthModal({
    baseUrl,
    setModalOpen,
    setJwtToken,
    apiKey,
}: {
    setModalOpen: (open: boolean) => void;
    setJwtToken: (jwtToken: string) => void;
    apiKey: string;
    baseUrl: string;
}) {
    const iframeSrc = `${baseUrl}/sdk/auth/frame?apiKey=${apiKey}`;
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [iframe, setIframe] = useState<IFrameWindow<
        IncomingModalIframeEventsType,
        OutgoingModalIframeEventsType
    > | null>(null);

    useEffect(() => {
        if (iframe == null) {
            return;
        }

        iframe.on("jwtToken", (data) => {
            setJwtToken(data.jwtToken);
            iframe.off("jwtToken");

            iframe.send("closeWindow", {
                closeWindow: "closeWindow",
            });

            if (iframe?.iframe.contentWindow != null) {
                iframe.iframe.contentWindow.close();
            }
            setModalOpen(false);
        });

        return () => {
            if (iframe) {
                iframe.off("jwtToken");

                if (iframe.iframe.contentWindow != null) {
                    iframe.iframe.contentWindow.close();
                }
            }
        };
    }, [iframe]);

    const handleIframeLoaded = async () => {
        if (iframeRef.current == null) {
            // The iframe should be load, here we should log on DD if possible
            console.error("Something wrong happened, please try again");
            return;
        }

        const initIframe = await IFrameWindow.init(iframeRef.current, {
            incomingEvents: incomingModalIframeEvents,
            outgoingEvents: outgoingModalIframeEvents,
        });
        setIframe(initIframe);
    };

    return (
        <ActionModal show={true} onClose={() => setModalOpen(false)}>
            <div style={{ position: "relative", width: "100%" }}>
                <button
                    aria-label="Close"
                    style={{
                        width: "1.5rem", // equivalent to w-6
                        position: "absolute",
                        right: "1.5rem", // equivalent to right-6
                        top: "1.5rem", // equivalent to top-6
                        cursor: "pointer",
                        color: "#67797F",
                        outlineOffset: "4px",
                        borderRadius: "100%",
                    }}
                    onClick={() => setModalOpen(false)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>
            <iframe
                ref={iframeRef}
                src={iframeSrc}
                onLoad={handleIframeLoaded}
                style={{
                    width: "448px",
                    height: "475px",
                    border: "1px solid #D0D5DD",
                    borderRadius: "16px",
                    padding: "48px 40px 32px",
                    backgroundColor: "#FFFFFF",
                    animation: "fadeIn 3s ease-in-out",
                }}
            />
        </ActionModal>
    );
}
