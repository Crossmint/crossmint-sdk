import React, {useEffect, useState} from "react";

import type {CrossmintCheckoutEvent, PaymentElement} from "@crossmint/client-sdk-base";
import {crossmintPaymentService, crossmintUiService} from "@crossmint/client-sdk-base";

export function CrossmintPaymentElement(props: PaymentElement) {
    const [height, setHeight] = useState(0);
    const { getIframeUrl, listenToEvents, emitQueryParams } = crossmintPaymentService(props);
    const { listenToEvents: listenToUiEvents } = crossmintUiService({ environment: props.environment });
    const [url] = useState(getIframeUrl());

    useEffect(() => {
        const clearListener = listenToEvents((event: MessageEvent<CrossmintCheckoutEvent>) => props.onEvent?.(event.data));

        return () => {
            if (clearListener) {
                clearListener();
            }
        }
    }, []);

    useEffect(() => {
        const clearListener = listenToUiEvents((event: MessageEvent<any>) => {
            const {type, payload} = event.data;

            switch (type) {
                case "ui:height.changed":
                    setHeight(payload.height);
                    break;
                default:
                    return;
            }
        });

        return () => {
            if (clearListener) {
                clearListener();
            }
        }
    }, []);

    useEffect(() => {
        emitQueryParams({
            recipient: props.recipient,
            mintConfig: props.mintConfig,
            locale: props.locale,
        });
    }, [props.recipient, props.mintConfig, props.locale]);

    return (
        <iframe
            src={url}
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
