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
    const { crossmint } = useCrossmint();
    const service = createEmbeddedOfframpService({
        apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }),
    });
    const url = service.iframe.getUrl(props);
    // A different document must never inherit a pending wallet request or its transport.
    return <EmbeddedOfframpDocument key={url} props={props} url={url} />;
}

function EmbeddedOfframpDocument({
    props,
    url,
}: {
    props: CrossmintEmbeddedOfframpProps;
    url: string;
}) {
    const [client, setClient] = useState<EmbeddedOfframpWebViewParent | null>(null);
    const [height, setHeight] = useState(0);
    const webViewRef = useRef<WebView>(null);
    const sendPending = useRef<object | null>(null);
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
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
                sendTransactionReply(client, outcome);
            }),
        ];
        return () => {
            sendPending.current = null;
            for (const id of ids) {
                client.off(id);
            }
        };
    }, [client]);

    const routeUrl = url.split("?")[0] ?? url;
    // Any other page the WebView ends up showing also receives the bridge, so only the offramp route may talk to it.
    // iOS reports the sender's full URL, Android only its origin.
    const routeOrigin = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i.exec(routeUrl)?.[0] ?? routeUrl;
    const isOfframpPage = (pageUrl: unknown) =>
        typeof pageUrl === "string" &&
        (pageUrl === routeOrigin ||
            (pageUrl.startsWith(routeUrl) && /^[?#/]?$/.test(pageUrl.slice(routeUrl.length, routeUrl.length + 1))));

    // A 4xx means the embed itself is wrong; a 5xx or a connection failure may pass on retry.
    const reportLoadFailure = (message: string, retriable: boolean) =>
        latestProps.current.onError?.({
            reason: retriable ? "provider-error" : "invalid-configuration",
            retriable,
            message,
        });

    return (
        <RNWebView
            ref={webViewRef}
            source={{ uri: url }}
            onLoadStart={() => {
                sendPending.current = null;
            }}
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
            onError={({ nativeEvent }) => reportLoadFailure(nativeEvent.description, true)}
            onHttpError={({ nativeEvent }) =>
                reportLoadFailure(`HTTP ${nativeEvent.statusCode}`, nativeEvent.statusCode >= 500)
            }
            style={{ width: "100%", height, backgroundColor: "transparent" }}
            scrollEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
        />
    );
}
