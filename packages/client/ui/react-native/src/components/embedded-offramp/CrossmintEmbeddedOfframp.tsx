import {
    type CrossmintEmbeddedOfframpProps,
    createEmbeddedOfframpService,
    sendTransactionReply,
    embeddedOfframpIncomingEvents,
    embeddedOfframpOutgoingEvents,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
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
                let outcome: { txId: unknown } | { error: unknown };
                try {
                    outcome = { txId: await latestProps.current.payer.signAndSendTransaction(tx) };
                } catch (error) {
                    outcome = { error };
                }
                sendPending.current = false;
                sendTransactionReply(client, outcome);
            }),
        ];
        return () => {
            for (const id of ids) {
                client.off(id);
            }
        };
    }, [client]);

    const url = service.iframe.getUrl(props);
    const routeUrl = url.split("?")[0] ?? url;
    // Any other page the WebView ends up showing also receives the bridge, so only the offramp route may talk to it.
    // iOS reports the sender's full URL, Android only its origin.
    const routeOrigin = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i.exec(routeUrl)?.[0] ?? routeUrl;
    const isOfframpPage = (pageUrl: unknown) =>
        typeof pageUrl === "string" &&
        (pageUrl === routeOrigin ||
            (pageUrl.startsWith(routeUrl) && /^[?#/]?$/.test(pageUrl.slice(routeUrl.length, routeUrl.length + 1))));

    const reportLoadFailure = (message: string) =>
        latestProps.current.onError?.({ reason: "invalid-configuration", retriable: false, message });

    return (
        <RNWebView
            ref={webViewRef}
            source={{ uri: url }}
            onMessage={(event) => {
                if (isOfframpPage(event.nativeEvent.url)) {
                    client?.handleMessage(event);
                }
            }}
            onOpenWindow={({ nativeEvent }) => {
                if (/^https?:/i.test(nativeEvent.targetUrl)) {
                    Linking.openURL(nativeEvent.targetUrl).catch(() => undefined);
                }
            }}
            onError={({ nativeEvent }) => reportLoadFailure(nativeEvent.description)}
            onHttpError={({ nativeEvent }) => reportLoadFailure(`HTTP ${nativeEvent.statusCode}`)}
            style={{ width: "100%", height, backgroundColor: "transparent" }}
            scrollEnabled={false}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
        />
    );
}
