import { useCrossmint } from "@/hooks";
import { useEffect, useRef, useState } from "react";

import {
    type CrossmintEmbeddedCheckoutV3Props,
    type EmbeddedCheckoutV3IFrameEmitter,
    crossmintEmbeddedCheckoutV3Service,
} from "@crossmint/client-sdk-base";

import { CryptoWalletConnectionHandler } from "./crypto/CryptoWalletConnectionHandler";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

export function EmbeddedCheckoutV3IFrame(props: CrossmintEmbeddedCheckoutV3Props) {
    const [iframeClient, setIframeClient] = useState<EmbeddedCheckoutV3IFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint);
    const embedV3Service = crossmintEmbeddedCheckoutV3Service({ apiClient });

    const ref = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(embedV3Service.iframe.createClient(iframe));
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
        <>
            <iframe
                ref={ref}
                src={embedV3Service.iframe.getUrl(props)}
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
                    backgroundColor: "transparent",
                }}
            />
            {props.payment.crypto.enabled ? <CryptoWalletConnectionHandler iframeClient={iframeClient} /> : null}
        </>
    );
}
