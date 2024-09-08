import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { IFrameWindow } from "@crossmint/client-sdk-window";
import { UIConfig } from "@crossmint/common-sdk-base";

import { Dialog, DialogContent } from "./dialog";

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

type AuthModalProps = {
    setModalOpen: (open: boolean) => void;
    setJwtToken: (jwtToken: string) => void;
    apiKey: string;
    baseUrl: string;
    appearance?: UIConfig;
};

export default function AuthModal({ setModalOpen, setJwtToken, apiKey, baseUrl, appearance }: AuthModalProps) {
    let iframeSrc = `${baseUrl}/sdk/auth/frame?apiKey=${apiKey}`;
    if (appearance != null) {
        // The appearance object is serialized into a query parameter
        iframeSrc += `&uiConfig=${encodeURIComponent(JSON.stringify(appearance))}`;
    }

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
    }, [iframe, setJwtToken, setModalOpen]);

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
        <Dialog open onOpenChange={setModalOpen}>
            <DialogContent onInteractOutside={(e: any) => e.preventDefault()}>
                HELLO
                {/* <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    onLoad={handleIframeLoaded}
                    title="Authentication Modal"
                    style={{
                        width: "448px",
                        height: "500px",
                        border: `1px solid ${appearance?.colors?.border ?? "#D0D5DD"}`,
                        borderRadius: appearance?.borderRadius ?? "16px",
                        padding: "48px 40px 32px",
                        backgroundColor: appearance?.colors?.background ?? "#FFFFFF",
                        animation: "fadeIn 3s ease-in-out",
                    }}
                /> */}
            </DialogContent>
        </Dialog>
    );
}
