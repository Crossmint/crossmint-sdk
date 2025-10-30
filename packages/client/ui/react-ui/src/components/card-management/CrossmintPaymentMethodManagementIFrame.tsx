import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    createPaymentMethodManagementService,
    type PaymentMethodManagementIFrameEmitter,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";
import type { CrossmintPaymentMethodManagementProps } from "@crossmint/client-sdk-base";

export function CrossmintPaymentMethodManagementIFrame(props: CrossmintPaymentMethodManagementProps) {
    const [iframeClient, setIframeClient] = useState<PaymentMethodManagementIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const ref = useRef<HTMLIFrameElement>(null);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, {
        usageOrigin: "client",
    });
    const paymentMethodManagementService = createPaymentMethodManagementService({ apiClient });

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(paymentMethodManagementService.iframe.createClient(iframe));
    }, [ref.current, iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        iframeClient.on("ui:height.changed", (data) => setHeight(data.height));

        return () => {
            iframeClient.off("ui:height.changed");
        };
    }, [iframeClient]);

    return (
        <iframe
            ref={ref}
            src={paymentMethodManagementService.iframe.getUrl(props)}
            id="crossmint-payment-method-management.iframe"
            role="crossmint-payment-method-management.iframe"
            allow="payment *; microphone; camera"
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
                backgroundColor: "transparent",
            }}
        />
    );
}
