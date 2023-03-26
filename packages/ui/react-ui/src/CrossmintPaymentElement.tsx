import React, { useEffect } from "react";

import { crossmintPaymentService } from "@crossmint/client-sdk-base";
import type { CrossmintCheckoutEvent, PaymentElement } from "@crossmint/client-sdk-base";

export function CrossmintPaymentElement(props: PaymentElement) {
    const { getIframeUrl, listenToEvents, emitQueryParams } = crossmintPaymentService(props);

    useEffect(() => {
        listenToEvents((event: MessageEvent<CrossmintCheckoutEvent>) => props.onEvent?.(event.data));
    }, [listenToEvents, props.onEvent]);

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
            style={{
                width: "100%",
                border: "none",
                margin: "0",
                padding: "0",
                height: "96px",
            }}
        ></iframe>
    );
}
