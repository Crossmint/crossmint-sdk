import {
    type CrossmintIdentityVerificationProps,
    createIdentityVerificationService,
    identityVerificationIncomingEvents,
    identityVerificationOutgoingEvents,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { useEffect, useRef, useState } from "react";
import type { WebView } from "react-native-webview";

import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

type IdentityVerificationWebViewParent = WebViewParent<
    typeof identityVerificationIncomingEvents,
    typeof identityVerificationOutgoingEvents
>;

export function CrossmintIdentityVerification(props: CrossmintIdentityVerificationProps) {
    const [client, setClient] = useState<IdentityVerificationWebViewParent | null>(null);
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
    const identityVerificationService = createIdentityVerificationService({ apiClient });

    useEffect(() => {
        const webView = webViewRef.current;
        if (!webView || client) {
            return;
        }
        setClient(
            new WebViewParent(
                { current: webView },
                {
                    incomingEvents: identityVerificationIncomingEvents,
                    outgoingEvents: identityVerificationOutgoingEvents,
                }
            )
        );
    }, [client]);

    useEffect(() => {
        if (client == null) {
            return;
        }

        const listenerIds = [
            client.on("ui:height.changed", (data) => setHeight(data.height)),
            client.on("kyc:ready", () => latestProps.current.onReady?.()),
            client.on("kyc:completed", (data) => latestProps.current.onComplete?.(data)),
            client.on("kyc:cancelled", () => latestProps.current.onCancel?.()),
            client.on("kyc:error", (data) => latestProps.current.onError?.(data)),
        ];

        return () => {
            for (const id of listenerIds) {
                client.off(id);
            }
        };
    }, [client]);

    return (
        <RNWebView
            ref={webViewRef}
            source={{ uri: identityVerificationService.iframe.getUrl(props) }}
            // Stays a function before the client exists: react-native-webview derives
            // messagingEnabled from `typeof onMessage === "function"`, and without it the
            // page has no window.ReactNativeWebView to detect.
            onMessage={(event) => client?.handleMessage(event)}
            style={{ width: "100%", height, backgroundColor: "transparent" }}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
        />
    );
}
