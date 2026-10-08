import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintCvcRecollectionProps,
    type CvcRecollectionIFrameEmitter,
    createCvcRecollectionService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

export function CrossmintCvcRecollectionIFrame(props: CrossmintCvcRecollectionProps) {
    const [iframeClient, setIframeClient] = useState<CvcRecollectionIFrameEmitter | null>(null);
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
    const cvcRecollectionService = createCvcRecollectionService({ apiClient });

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(cvcRecollectionService.iframe.createClient(iframe));
    }, [iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }

        const heightListener = iframeClient.on("ui:height.changed", (data) => setHeight(data.height));
        // cvc:complete carries an empty object; the callback deliberately receives nothing.
        const completeListener = iframeClient.on("cvc:complete", () => latestProps.current.onComplete?.());
        const errorListener = iframeClient.on("cvc:error", (data) => latestProps.current.onError?.(data));

        return () => {
            iframeClient.off(heightListener);
            iframeClient.off(completeListener);
            iframeClient.off(errorListener);
        };
    }, [iframeClient]);

    return (
        <iframe
            ref={ref}
            src={cvcRecollectionService.iframe.getUrl(props)}
            id="crossmint-cvc-recollection.iframe"
            title="CVC recollection"
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
