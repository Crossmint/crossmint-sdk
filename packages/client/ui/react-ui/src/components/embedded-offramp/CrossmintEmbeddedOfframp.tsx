import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintEmbeddedOfframpProps,
    type EmbeddedOfframpIFrameEmitter,
    type SignMessageOutcome,
    createEmbeddedOfframpService,
    sendTransactionReply,
    signMessageReply,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

export function CrossmintEmbeddedOfframp(props: CrossmintEmbeddedOfframpProps) {
    const { crossmint } = useCrossmint();
    const service = createEmbeddedOfframpService({
        apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }),
    });
    const url = service.iframe.getUrl(props);
    // A different document must never inherit a pending wallet request or its transport.
    return <EmbeddedOfframpDocument key={url} props={props} url={url} service={service} />;
}

function EmbeddedOfframpDocument({
    props,
    url,
    service,
}: {
    props: CrossmintEmbeddedOfframpProps;
    url: string;
    service: ReturnType<typeof createEmbeddedOfframpService>;
}) {
    const [iframeClient, setIframeClient] = useState<EmbeddedOfframpIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);
    const ref = useRef<HTMLIFrameElement>(null);
    const sendPending = useRef<object | null>(null);
    const signPending = useRef<object | null>(null);
    const hasLoaded = useRef(false);
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    useEffect(() => {
        if (ref.current == null || iframeClient != null) {
            return;
        }
        setIframeClient(service.iframe.createClient(ref.current));
    }, [iframeClient, service.iframe.createClient]);

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
                const request = {};
                sendPending.current = request;
                let outcome: { txId: unknown } | { error: unknown };
                try {
                    outcome = { txId: await latestProps.current.payer.signAndSendTransaction(tx) };
                } catch (error) {
                    outcome = { error };
                }
                // A reload, unmount, or replacement session invalidates this request.
                if (sendPending.current !== request) {
                    return;
                }
                sendPending.current = null;
                sendTransactionReply(iframeClient, outcome);
            }),
            iframeClient.on("crypto:sign-message", async (request) => {
                if (signPending.current) {
                    return;
                }
                const pending = {};
                signPending.current = pending;
                let outcome: SignMessageOutcome;
                try {
                    const { payer } = latestProps.current;
                    if (payer.signMessage == null) {
                        throw new Error("This payer cannot sign messages");
                    }
                    outcome = { signature: await payer.signMessage(request) };
                } catch (error) {
                    outcome = { error };
                }
                if (signPending.current !== pending) {
                    return;
                }
                signPending.current = null;
                signMessageReply(iframeClient, outcome);
            }),
        ];
        return () => {
            sendPending.current = null;
            signPending.current = null;
            for (const id of ids) {
                iframeClient.off(id);
            }
        };
    }, [iframeClient]);

    return (
        <iframe
            ref={ref}
            src={url}
            onLoad={() => {
                // The first load may finish after the document has already requested signing.
                if (hasLoaded.current) {
                    sendPending.current = null;
                    signPending.current = null;
                }
                hasLoaded.current = true;
            }}
            id="crossmint-embedded-offramp.iframe"
            title="Withdraw"
            allow="camera"
            style={{
                border: "none",
                width: "100%",
                overflow: "hidden",
                display: "block",
                height: props.fill ? "100%" : `${height}px`,
            }}
        />
    );
}
