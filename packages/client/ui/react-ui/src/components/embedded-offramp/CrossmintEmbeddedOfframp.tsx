import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintEmbeddedOfframpProps,
    type EmbeddedOfframpIFrameEmitter,
    createEmbeddedOfframpService,
    sendTransactionReply,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

export function CrossmintEmbeddedOfframp(props: CrossmintEmbeddedOfframpProps) {
    const [iframeClient, setIframeClient] = useState<EmbeddedOfframpIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);
    const ref = useRef<HTMLIFrameElement>(null);
    const sendPending = useRef(false);
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
                if (sendPending.current) {
                    return;
                }
                sendPending.current = true;
                let outcome: { txId: unknown } | { error: unknown };
                try {
                    outcome = { txId: await latestProps.current.payer.signAndSendTransaction(tx) };
                } catch (error) {
                    outcome = { error };
                }
                sendPending.current = false;
                sendTransactionReply(iframeClient, outcome);
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
