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
    console.log("Attempting to render auth modal");
    const iframeSrc = `${baseUrl}/sdk/auth/frame?apiKey=${apiKey}`;
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [iframe, setIframe] = useState<IFrameWindow<
        IncomingModalIframeEventsType,
        OutgoingModalIframeEventsType
    > | null>(null);

    console.log("After var declaration");

    useEffect(() => {
        console.log("In use effect");

        if (iframe == null) {
            console.log("iframe == null, returning");
            return;
        }

        iframe.on("jwtToken", (data) => {
            console.log("Setting jwt token");
            setJwtToken(data.jwtToken);

            console.log("iframe.off");
            iframe.off("jwtToken");

            console.log("iframe.send");
            iframe.send("closeWindow", {
                closeWindow: "closeWindow",
            });

            console.log("iframe?.iframe.contentWindow != null");
            if (iframe?.iframe.contentWindow != null) {
                console.log("iframe.iframe.contentWindow.close();");
                iframe.iframe.contentWindow.close();
            }

            console.log("Set modal open false");
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
