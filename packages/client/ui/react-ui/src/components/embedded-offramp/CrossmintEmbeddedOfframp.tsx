import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintEmbeddedOfframpProps,
    type EmbeddedOfframpIFrameEmitter,
    createEmbeddedOfframpService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

export function CrossmintEmbeddedOfframp(props: CrossmintEmbeddedOfframpProps) {
    const [iframeClient, setIframeClient] = useState<EmbeddedOfframpIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);
    const ref = useRef<HTMLIFrameElement>(null);
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    const { crossmint } = useCrossmint();
    const service = createEmbeddedOfframpService({
        apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }),
    });

    useEffect(() => {
        if (ref.current == null || iframeClient != null) {
            return;
        }
        setIframeClient(service.iframe.createClient(ref.current));
    }, [iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        const ids = [
            iframeClient.on("ui:height.changed", (data) => setHeight(data.height)),
            iframeClient.on("offramp:ready", () => latestProps.current.onReady?.()),
            iframeClient.on("offramp:status", (data) => latestProps.current.onStatusChange?.(data)),
            iframeClient.on("offramp:completed", (data) => latestProps.current.onComplete?.(data)),
            iframeClient.on("offramp:cancelled", () => latestProps.current.onCancel?.()),
            iframeClient.on("offramp:error", (data) => latestProps.current.onError?.(data)),
            iframeClient.on("crypto:send-transaction", async (tx) => {
                try {
                    const txId = await latestProps.current.payer.signAndSendTransaction(tx);
                    iframeClient.send("crypto:send-transaction:success", { txId });
                } catch (error) {
                    iframeClient.send("crypto:send-transaction:failed", {
                        error: (error as Error)?.message ?? "The wallet failed",
                        rejected: (error as { rejected?: boolean })?.rejected === true,
                    });
                }
            }),
        ];
        return () => {
            for (const id of ids) {
                iframeClient.off(id);
            }
        };
    }, [iframeClient]);

    return (
        <iframe
            ref={ref}
            src={service.iframe.getUrl(props)}
            id="crossmint-embedded-offramp.iframe"
            title="Withdraw"
            allow="camera"
            style={{ border: "none", width: "100%", overflow: "hidden", display: "block", height: `${height}px` }}
        />
    );
}
