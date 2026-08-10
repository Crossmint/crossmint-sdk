import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintIdentityVerificationProps,
    type IdentityVerificationIFrameEmitter,
    createIdentityVerificationService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";
import { useLatest } from "@/hooks/useLatest";

export function CrossmintIdentityVerificationIFrame(props: CrossmintIdentityVerificationProps) {
    const [iframeClient, setIframeClient] = useState<IdentityVerificationIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const ref = useRef<HTMLIFrameElement>(null);

    const latestProps = useLatest(props);

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, { usageOrigin: "client" });
    const identityVerificationService = createIdentityVerificationService({ apiClient });

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(identityVerificationService.iframe.createClient(iframe));
    }, [iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }

        const heightListener = iframeClient.on("ui:height.changed", (data) => setHeight(data.height));
        const readyListener = iframeClient.on("kyc:ready", () => latestProps.current.onReady?.());
        const completedListener = iframeClient.on("kyc:completed", (data) => latestProps.current.onComplete?.(data));
        const cancelledListener = iframeClient.on("kyc:cancelled", () => latestProps.current.onCancel?.());
        const errorListener = iframeClient.on("kyc:error", (data) => latestProps.current.onError?.(data));

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
            src={identityVerificationService.iframe.getUrl(props)}
            id="crossmint-identity-verification.iframe"
            title="Identity verification"
            allow="camera"
            style={{
                border: "none",
                width: "100%",
                overflow: "hidden",
                display: "block",
                height: `${height}px`,
            }}
        />
    );
}
