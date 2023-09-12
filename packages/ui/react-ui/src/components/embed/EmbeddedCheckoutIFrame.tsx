import { useEffect, useState } from "react";

import { crossmintIFrameService } from "@crossmint/client-sdk-base";
import { CrossmintEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

export default function CrossmintEmbeddedCheckoutIFrame(props: CrossmintEmbeddedCheckoutProps) {
    const { getUrl, listenToInternalEvents } = crossmintIFrameService(props);

    const [height, setHeight] = useState(0);
    const [url] = useState(getUrl(props));

    useEffect(() => {
        const clearListener = listenToInternalEvents((event) => {
            const { type, payload } = event.data;

            switch (type) {
                case "ui:height.changed":
                    setHeight(payload.height);
                    break;
                default:
                    return;
            }
        });

        return () => {
            clearListener();
        };
    }, []);

    return (
        <iframe
            src={url}
            id="crossmint-embedded-checkout.iframe"
            role="crossmint-embedded-checkout.iframe"
            allow="payment *"
            style={{
                border: "none !important",
                padding: "0px !important",
                width: "100% !important",
                minWidth: "100% !important",
                overflow: "hidden !important",
                display: "block !important",
                userSelect: "none",
                transform: "translate(0px) !important",
                opacity: "1",
                transition: "ease 0s, opacity 0.4s ease 0.1s",
                height: `${height}px`,
            }}
        />
    );
}
