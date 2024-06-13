import { IFrameWindow } from "@crossmint/client-sdk-window";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

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
        if (!iframeRef.current) {
            return;
        }

        (async () => {
            const initIframe = await IFrameWindow.init(`${baseUrl}/sdk/auth/frame`, {
                existingIFrame: iframeRef.current,
                incomingEvents: {
                    jwtToken: z.object({
                        jwtToken: z.string(),
                    })
                }
            });
            console.log("iframe", initIframe);
            setIframe(initIframe);
        })();
    }, [iframeRef.current]);

    useEffect(() => {
        console.log("iframe", iframe);

        if (!iframe) {
            return;
        }
        iframe.on("jwtToken", data => {
            console.log("jwtToken in sdk mock page", data);
            setJwtToken(data.jwtToken);
            setModalOpen(false);
        });
    }, [iframe]);

    const iframeSrc = `${baseUrl}/sdk/auth/frame?api_key=${apiKey}`;

    return (
        <div className="flex flex-col items-center w-full">
            <iframe ref={iframeRef} src={iframeSrc} className="w-[300px] h-[100px]" />
        </div>
    );
}
