import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintKycVerificationProps,
    type KycVerificationIFrameEmitter,
    createKycVerificationService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

export function CrossmintKycVerificationIFrame(props: CrossmintKycVerificationProps) {
    const [iframeClient, setIframeClient] = useState<KycVerificationIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const ref = useRef<HTMLIFrameElement>(null);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, { usageOrigin: "client" });
    const kycVerificationService = createKycVerificationService({ apiClient });

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(kycVerificationService.iframe.createClient(iframe));
    }, [ref.current, iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }

        const heightListener = iframeClient.on("ui:height.changed", (data) => setHeight(data.height));
        const readyListener = iframeClient.on("kyc:ready", () => props.onReady?.());
        const completedListener = iframeClient.on("kyc:completed", (data) => props.onComplete?.(data));
        const cancelledListener = iframeClient.on("kyc:cancelled", () => props.onCancel?.());
        const errorListener = iframeClient.on("kyc:error", (data) => props.onError?.(data));

        return () => {
            iframeClient.off(heightListener);
            iframeClient.off(readyListener);
            iframeClient.off(completedListener);
            iframeClient.off(cancelledListener);
            iframeClient.off(errorListener);
        };
    }, [iframeClient]);

    return (
        <iframe
            ref={ref}
            src={kycVerificationService.iframe.getUrl(props)}
            id="crossmint-kyc-verification.iframe"
            role="crossmint-kyc-verification.iframe"
            allow="microphone; camera"
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
