import {
    type CrossmintIdentityVerificationProps,
    createIdentityVerificationService,
    identityVerificationIncomingEvents,
    identityVerificationOutgoingEvents,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { useEffect, useMemo, useRef, useState } from "react";
import type { WebView, WebViewMessageEvent } from "react-native-webview";

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

    // Keyed on primitives, not on `props`: a caller passing an inline credentials
    // object would otherwise rebuild the URL every render and reload the WebView.
    const { apiKey } = crossmint;
    const { inquiryId, sessionToken } = props.credentials;
    const uri = useMemo(() => {
        const apiClient = createCrossmintApiClient(crossmint, { usageOrigin: "client" });
        return createIdentityVerificationService({ apiClient }).iframe.getUrl(props);
    }, [apiKey, inquiryId, sessionToken, props.locale]);

    // New credentials mean a new page, so the old height must not persist.
    useEffect(() => {
        setHeight(0);
    }, [uri]);

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
    }, [webViewRef.current, client]);

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
            source={{ uri }}
            onMessage={(event: WebViewMessageEvent) => client?.handleMessage(event)}
            style={{ width: "100%", height, backgroundColor: "transparent" }}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
        />
    );
}
