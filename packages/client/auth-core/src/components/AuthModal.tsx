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
    const iframeSrc = `${baseUrl}/sdk/auth/frame?api_key=${apiKey}`;
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
            <iframe
                ref={iframeRef}
                src={iframeSrc}
                onLoad={handleIframeLoaded}
                style={{
                    width: "448px",
                    height: "530px",
                    border: "1px solid #D0D5DD",
                    borderRadius: "16px",
                    padding: "48px 40px",
                    backgroundColor: "#FFFFFF",
                    animation: "fadeIn 3s ease-in-out",
                }}
            />
        </ActionModal>
    );
}
