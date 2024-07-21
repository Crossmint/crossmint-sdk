import { useCrossmintSdk } from "@/hooks";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { IFrameWindow } from "@crossmint/client-sdk-window";

const FROM_PARENT_EVENTS = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
};

export function CrossmintEmbeddedCheckout() {
    const [height, setHeight] = useState(0);

    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [iframeClient, setIframeClient] = useState<IFrameWindow<typeof FROM_PARENT_EVENTS, any> | null>(null);

    const { apiClient } = useCrossmintSdk();

    async function createIframeClient(iframe: HTMLIFrameElement) {
        setIframeClient(
            await IFrameWindow.init(iframe, {
                incomingEvents: FROM_PARENT_EVENTS,
            })
        );
    }

    useEffect(() => {
        if (!iframeRef.current) {
            return;
        }
        createIframeClient(iframeRef.current);
    }, [iframeRef.current]);

    useEffect(() => {
        if (!iframeClient) {
            return;
        }
        iframeClient.on("ui:height.changed", (data) => {
            setHeight(data.height);
        });
    }, [iframeClient]);

    return (
        <iframe
            ref={iframeRef}
            src={apiClient.buildUrl("/sdk/2024-03-05/embedded-checkout")}
            id="crossmint-embedded-checkout.iframe"
            role="crossmint-embedded-checkout.iframe"
            allow="payment *"
            style={{
                boxShadow: "none",
                border: "none",
                padding: "0px",
                width: "100%",
                minWidth: "100%",
                overflow: "hidden",
                display: "block",
                userSelect: "none",
                transform: "translate(0px)",
                opacity: "1",
                transition: "ease 0s, opacity 0.4s ease 0.1s",
                height: `${height}px`,
            }}
        />
    );
}
