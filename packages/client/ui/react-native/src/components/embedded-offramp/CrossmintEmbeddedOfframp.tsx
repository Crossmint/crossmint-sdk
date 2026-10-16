import {
    type CrossmintEmbeddedOfframpProps,
    createEmbeddedOfframpService,
    embeddedOfframpIncomingEvents,
    embeddedOfframpOutgoingEvents,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { useEffect, useRef, useState } from "react";
import type { WebView } from "react-native-webview";

import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

type EmbeddedOfframpWebViewParent = WebViewParent<
    typeof embeddedOfframpIncomingEvents,
    typeof embeddedOfframpOutgoingEvents
>;

export function CrossmintEmbeddedOfframp(props: CrossmintEmbeddedOfframpProps) {
    const [client, setClient] = useState<EmbeddedOfframpWebViewParent | null>(null);
    const [height, setHeight] = useState(0);
    const webViewRef = useRef<WebView>(null);
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
        if (webViewRef.current == null || client != null) {
            return;
        }
        setClient(
            new WebViewParent(webViewRef, {
                incomingEvents: embeddedOfframpIncomingEvents,
                outgoingEvents: embeddedOfframpOutgoingEvents,
            })
        );
    }, [client]);

    useEffect(() => {
        if (client == null) {
            return;
        }
        const ids = [
            client.on("ui:height.changed", (data) => setHeight(data.height)),
            client.on("offramp:ready", () => latestProps.current.onReady?.()),
            client.on("offramp:status", (data) => latestProps.current.onStatusChange?.(data)),
            client.on("offramp:completed", (data) => latestProps.current.onComplete?.(data)),
            client.on("offramp:cancelled", () => latestProps.current.onCancel?.()),
            client.on("offramp:error", (data) => latestProps.current.onError?.(data)),
            client.on("crypto:send-transaction", async (tx) => {
                if (sendPending.current) {
                    return;
                }
                sendPending.current = true;
                let reply: "crypto:send-transaction:success" | "crypto:send-transaction:failed";
                let payload: { txId: string } | { error: string; rejected: boolean };
                try {
                    const txId: unknown = await latestProps.current.payer.signAndSendTransaction(tx);
                    if (typeof txId === "string" && txId !== "") {
                        reply = "crypto:send-transaction:success";
                        payload = { txId };
                    } else {
                        reply = "crypto:send-transaction:failed";
                        payload = { error: "The wallet returned no transaction id", rejected: false };
                    }
                } catch (error) {
                    reply = "crypto:send-transaction:failed";
                    payload = {
                        error: (error as Error)?.message ?? "The wallet failed",
                        rejected: (error as { rejected?: boolean })?.rejected === true,
                    };
                }
                sendPending.current = false;
                client.send(reply as never, payload as never);
            }),
        ];
        return () => {
            for (const id of ids) {
                client.off(id);
            }
        };
    }, [client]);

    const reportLoadFailure = (message: string) =>
        latestProps.current.onError?.({ reason: "invalid-configuration", retriable: false, message });

    return (
        <RNWebView
            ref={webViewRef}
            source={{ uri: service.iframe.getUrl(props) }}
            onMessage={(event) => client?.handleMessage(event)}
            onError={({ nativeEvent }) => reportLoadFailure(nativeEvent.description)}
            onHttpError={({ nativeEvent }) => reportLoadFailure(`HTTP ${nativeEvent.statusCode}`)}
            style={{ width: "100%", height, backgroundColor: "transparent" }}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
        />
    );
}
