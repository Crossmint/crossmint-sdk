import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintProtectedInputProps,
    type ProtectedInputIFrameEmitter,
    createProtectedInputService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

export function CrossmintProtectedInputIFrame(props: CrossmintProtectedInputProps) {
    const [iframeClient, setIframeClient] = useState<ProtectedInputIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const ref = useRef<HTMLIFrameElement>(null);

    // The listeners are subscribed once, so reading callbacks off this ref is what keeps a
    // late event calling the render's props rather than the ones captured at subscribe time.
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, { usageOrigin: "client" });
    const protectedInputService = createProtectedInputService({ apiClient });

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(protectedInputService.iframe.createClient(iframe));
    }, [iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }

        const heightListener = iframeClient.on("ui:height.changed", (data) => setHeight(data.height));
        const createdListener = iframeClient.on("protected-input:created", (data) =>
            latestProps.current.onCreated?.(data)
        );
        const errorListener = iframeClient.on("protected-input:error", (data) => latestProps.current.onError?.(data));

        return () => {
            iframeClient.off(heightListener);
            iframeClient.off(createdListener);
            iframeClient.off(errorListener);
        };
    }, [iframeClient]);

    // No `allow` attribute: the password field is a plain text element and needs no device access.
    return (
        <iframe
            ref={ref}
            src={protectedInputService.iframe.getUrl(props)}
            id="crossmint-protected-input.iframe"
            title="Protected input"
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
