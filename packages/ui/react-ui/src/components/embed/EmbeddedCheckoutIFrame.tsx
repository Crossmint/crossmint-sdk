import { useEffect, useState } from "react";

import { CrossmintInternalEvent, IncomingInternalEvent, crossmintIFrameService } from "@crossmint/client-sdk-base";
import { CrossmintEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

type CrossmintEmbeddedCheckoutIFrameProps = CrossmintEmbeddedCheckoutProps & {
    onInternalEvent?: (event: IncomingInternalEvent) => void;
};

export default function CrossmintEmbeddedCheckoutIFrame({
    onInternalEvent,
    ...props
}: CrossmintEmbeddedCheckoutIFrameProps) {
    const { getUrl, listenToEvents, listenToInternalEvents, emitInternalEvent } = crossmintIFrameService(props);

    const [height, setHeight] = useState(0);
    const [url] = useState(getUrl(props));

    // Public events
    useEffect(() => {
        const clearListener = listenToEvents((event) => {
            props.onEvent?.(event.data);
        });

        return () => {
            clearListener();
        };
    }, []);

    // Internal events
    useEffect(() => {
        const clearListener = listenToInternalEvents((event) => {
            const { type, payload } = event.data;

            if (type === "ui:height.changed") {
                setHeight(payload.height);
            }

            onInternalEvent?.(event.data);
        });

        return () => {
            clearListener();
        };
    }, []);

    // TODO: Emit updatable parameters

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
