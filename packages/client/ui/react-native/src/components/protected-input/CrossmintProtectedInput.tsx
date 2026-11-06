import {
    type CrossmintProtectedInputProps,
    createProtectedInputService,
    protectedInputIncomingEvents,
    protectedInputOutgoingEvents,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { useEffect, useRef, useState } from "react";
import type { WebView } from "react-native-webview";

import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

type ProtectedInputWebViewParent = WebViewParent<
    typeof protectedInputIncomingEvents,
    typeof protectedInputOutgoingEvents
>;

/**
 * React Native counterpart of the web `CrossmintProtectedInput`: the hosted protected-input
 * page in a WebView. The buyer types the password of their account on a merchant site there;
 * the password never reaches this component or the app, and `onCreated` hands back an opaque
 * `protectedInputId` for Universal Checkout. Takes the buyer's Crossmint `jwt`, like
 * `CrossmintPaymentMethodManagement`. A WebView that cannot load the page reports
 * `onError({ code: "load_failed" })`, a code this component adds to the ones the page posts.
 */
export function CrossmintProtectedInput(props: CrossmintProtectedInputProps) {
    const [client, setClient] = useState<ProtectedInputWebViewParent | null>(null);
    const [height, setHeight] = useState(0);
    const webViewRef = useRef<WebView>(null);

    // Listeners subscribe once, so callbacks are read off a ref: a late event calls
    // the current render's props rather than the ones captured at subscribe time.
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, { usageOrigin: "client" });
    const protectedInputService = createProtectedInputService({ apiClient });

    useEffect(() => {
        if (!webViewRef.current || client) {
            return;
        }
        setClient(
            new WebViewParent(webViewRef, {
                incomingEvents: protectedInputIncomingEvents,
                outgoingEvents: protectedInputOutgoingEvents,
            })
        );
    }, [client]);

    useEffect(() => {
        if (client == null) {
            return;
        }

        const listenerIds = [
            client.on("ui:height.changed", (data) => setHeight(data.height)),
            client.on("protected-input:created", (data) => latestProps.current.onCreated?.(data)),
            client.on("protected-input:error", (data) => latestProps.current.onError?.(data)),
        ];

        return () => {
            for (const id of listenerIds) {
                client.off(id);
            }
        };
    }, [client]);

    // A failed load produces no terminal event and the view stays 0px tall, so report it.
    const reportLoadFailure = (message: string) => latestProps.current.onError?.({ code: "load_failed", message });

    // No targetOrigin: inside a WebView the page detects `ReactNativeWebView` and speaks the
    // native message channel instead of postMessage.
    return (
        <RNWebView
            ref={webViewRef}
            source={{ uri: protectedInputService.iframe.getUrl(props) }}
            // Stays a function before the client exists: react-native-webview derives
            // messagingEnabled from `typeof onMessage === "function"`, and without it the
            // page has no window.ReactNativeWebView to detect.
            onMessage={(event) => client?.handleMessage(event)}
            onError={({ nativeEvent }) => reportLoadFailure(nativeEvent.description)}
            onHttpError={({ nativeEvent }) => reportLoadFailure(`HTTP ${nativeEvent.statusCode}`)}
            style={{ width: "100%", height, backgroundColor: "transparent" }}
            domStorageEnabled={true}
        />
    );
}
