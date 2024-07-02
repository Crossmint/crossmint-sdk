import { IFrameWindow } from "@crossmint/client-sdk-window";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import ActionModal from "./ActionModal";

const incomingModalIframeEvents = {
    jwtToken: z.object({
        jwtToken: z.string(),
    }),
};

type IncomingModalIframeEventsType = {
    jwtToken: typeof incomingModalIframeEvents.jwtToken;
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
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [iframe, setIframe] = useState<IFrameWindow<IncomingModalIframeEventsType, {}> | null>(null);

    useEffect(() => {
        if (iframe == null) {
            return;
        }

        iframe.on("jwtToken", data => {
            setJwtToken(data.jwtToken);
            iframe.off("jwtToken")

            if (iframe?.iframe.contentWindow != null) {
                iframe.iframe.contentWindow.close();
            }
            setModalOpen(false);
        });

        // return () => {
        //     if (iframe) {
        //         iframe.off("jwtToken");

        //         if (iframe.iframe.contentWindow != null) {
        //             iframe.iframe.contentWindow.close();
        //         }
        //     }
        // }
    }, [iframe]);


    const handleIframeLoaded = async () => {
        const initIframe = await IFrameWindow.init(`${baseUrl}/sdk/auth/frame?api_key=${apiKey}`, {
            existingIFrame: iframeRef.current,
            incomingEvents: {
                jwtToken: z.object({
                    jwtToken: z.string(),
                })
            }
        });
        setIframe(initIframe);
    }

    const iframeSrc = `${baseUrl}/sdk/auth/frame?api_key=${apiKey}`;
    return (
        <ActionModal show={true} onClose={() => setModalOpen(false)}>
            <div className="flex flex-col items-center w-[500px] h-[600px]">
                <iframe ref={iframeRef} src={iframeSrc} onLoad={handleIframeLoaded} style={{ width: "500px", height: "600px" }} />
            </div>
        </ActionModal>
    );
}

