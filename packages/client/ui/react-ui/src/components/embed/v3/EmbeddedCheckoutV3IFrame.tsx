import { useCrossmint } from "@/hooks";
import { useEffect, useRef, useState } from "react";

import {
    CrossmintEmbeddedCheckoutV3Props,
    EmbeddedCheckoutV3IFrameEmitter,
    embeddedCheckoutV3IncomingEvents,
    embeddedCheckoutV3OutgoingEvents,
} from "@crossmint/client-sdk-base";
import { IFrameWindow } from "@crossmint/client-sdk-window";

export function EmbeddedCheckoutV3IFrame(props: CrossmintEmbeddedCheckoutV3Props) {
    const [iframeClient, setIframeClient] = useState<EmbeddedCheckoutV3IFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const { apiClient } = useCrossmint();
    const ref = useRef<HTMLIFrameElement>(null);

    async function createIFrameClient(iframe: HTMLIFrameElement) {
        setIframeClient(
            await IFrameWindow.init(iframe, {
                incomingEvents: embeddedCheckoutV3IncomingEvents,
                outgoingEvents: embeddedCheckoutV3OutgoingEvents,
            })
        );
    }

    useEffect(() => {
        if (!ref.current || iframeClient) {
            return;
        }
        createIFrameClient(ref.current);
    }, [ref.current, iframeClient]);

    useEffect(() => {
        if (!iframeClient) {
            return;
        }

        iframeClient.on("ui:height.changed", (data) => setHeight(data.height));
    }, [iframeClient]);

    return (
        <iframe
            ref={ref}
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
