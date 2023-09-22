import { useEffect, useState } from "react";

import { IncomingInternalEvent, IncomingInternalEvents, crossmintIFrameService } from "@crossmint/client-sdk-base";
import { CrossmintEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

type CrossmintEmbeddedCheckoutIFrameProps = CrossmintEmbeddedCheckoutProps & {
    onInternalEvent?: (event: IncomingInternalEvent) => void;
};

export default function CrossmintEmbeddedCheckoutIFrame({
    onInternalEvent,
    ...props
}: CrossmintEmbeddedCheckoutIFrameProps) {
    const { getUrl, listenToEvents, listenToInternalEvents } = crossmintIFrameService(props);

    const [height, setHeight] = useState(0);
    const [url] = useState(getUrl(props));

    // Public events
    useEffect(() => {
        const clearListener = listenToEvents((event) => props.onEvent?.(event.data));

        return () => {
            clearListener();
        };
    }, []);

    // Internal events
    useEffect(() => {
        const clearListener = listenToInternalEvents((event) => {
            const { type, payload } = event.data;

            if (type === IncomingInternalEvents.UI_HEIGHT_CHANGED) {
                setHeight(payload.height);
            }

            onInternalEvent?.(event.data);
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
                boxShadow: "none !important",
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
