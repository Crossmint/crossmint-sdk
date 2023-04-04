import React, { useEffect, useState } from "react";

import { crossmintPaymentService, crossmintUiService } from "@crossmint/client-sdk-base";
import type { CrossmintCheckoutEvent, PaymentElement } from "@crossmint/client-sdk-base";

export function CrossmintPaymentElement(props: PaymentElement) {
    const [height, setHeight] = useState(0);
    const { getIframeUrl, listenToEvents, emitQueryParams } = crossmintPaymentService(props);
    const { listenToEvents: listenToUiEvents } = crossmintUiService({ environment: props.environment });

    useEffect(() => {
        listenToEvents((event: MessageEvent<CrossmintCheckoutEvent>) => props.onEvent?.(event.data));
    }, [listenToEvents, props.onEvent]);

    useEffect(() => {
        listenToUiEvents((event: MessageEvent<any>) => {
            const { type, payload } = event.data;

            switch (type) {
                case "ui:height.changed":
                    setHeight(payload.height);
                    break;
                default:
                    return;
            }
        });
    }, []);

    useEffect(() => {
        emitQueryParams({
            recipient: props.recipient,
            mintConfig: props.mintConfig,
            locale: props.locale,
        });
    }, [emitQueryParams, props.recipient, props.mintConfig, props.locale]);

    const iframeUrl = getIframeUrl();

    return (
        <iframe
            src={iframeUrl}
            id="iframe-crossmint-payment-element"
            role="iframe-crossmint-payment-element"
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
        ></iframe>
    );
}
