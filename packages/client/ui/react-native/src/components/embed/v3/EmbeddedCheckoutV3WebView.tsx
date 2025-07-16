import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { type CrossmintEmbeddedCheckoutV3Props, crossmintEmbeddedCheckoutV3Service } from "@crossmint/client-sdk-base";
import { WebViewParent } from "@crossmint/client-sdk-rn-window";
import { embeddedCheckoutV3IncomingEvents, embeddedCheckoutV3OutgoingEvents } from "@crossmint/client-sdk-base";

import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import { userAgent } from "@/utils/embed/userAgent";
import { PayerConnectionHandler } from "./crypto/PayerConnectionHandler";
import type { PayerSupportedBlockchains } from "@crossmint/common-sdk-base";

export function EmbeddedCheckoutV3WebView(props: CrossmintEmbeddedCheckoutV3Props) {
    const [webViewClient, setWebViewClient] = useState<WebViewParent<
        typeof embeddedCheckoutV3IncomingEvents,
        typeof embeddedCheckoutV3OutgoingEvents
    > | null>(null);
    const [height, setHeight] = useState(0);

    const initialChainRef = useRef(props.payment.crypto.payer?.initialChain);

    const memoizedProps = useRef(props);
    if (havePropsChanged(props, memoizedProps.current)) {
        const newProps = { ...props };
        const initialChainPreservation = shouldPreserveInitialChain(props, initialChainRef.current);
        if (initialChainPreservation.shouldPreserve) {
            newProps.payment.crypto.payer = initialChainPreservation.updatedPayer;
        }
        memoizedProps.current = newProps;
    }

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, {
        usageOrigin: "client",
    });
    const embeddedCheckoutService = crossmintEmbeddedCheckoutV3Service({ apiClient });

    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
        const webView = webViewRef.current;
        if (!webView || webViewClient) {
            return;
        }

        const client = new WebViewParent(
            { current: webView },
            {
                incomingEvents: embeddedCheckoutV3IncomingEvents,
                outgoingEvents: embeddedCheckoutV3OutgoingEvents,
            }
        );
        setWebViewClient(client);
    }, [webViewRef.current, webViewClient]);

    useEffect(() => {
        if (webViewClient == null) {
            return;
        }

        const handleHeightChanged = (data: { height: number }) => setHeight(data.height);
        webViewClient.on("ui:height.changed", handleHeightChanged);

        return () => {
            webViewClient.off("ui:height.changed");
        };
    }, [webViewClient]);

    const handleMessage = (event: WebViewMessageEvent) => {
        if (webViewClient) {
            webViewClient.handleMessage(event);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <WebView
                ref={webViewRef}
                source={{ uri: embeddedCheckoutService.iframe.getUrl(memoizedProps.current) }}
                onMessage={handleMessage}
                style={{
                    width: "100%",
                    minWidth: "100%",
                    height,
                    backgroundColor: "transparent",
                    overflow: "hidden",
                    opacity: 1,
                    padding: 0,
                    boxShadow: "none",
                    borderWidth: 0,
                    transform: [{ translateX: 0 }],
                }}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                allowsBackForwardNavigationGestures={false}
                allowsLinkPreview={false}
                scrollEnabled={false}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                domStorageEnabled={true}
                mixedContentMode="always"
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                geolocationEnabled={true}
                userAgent={userAgent}
            />
            {memoizedProps.current.payment.crypto.enabled ? (
                memoizedProps.current.payment.crypto.payer != null ? (
                    <PayerConnectionHandler
                        payer={memoizedProps.current.payment.crypto.payer}
                        webViewClient={webViewClient}
                    />
                ) : (
                    <ThrowError message="If 'payment.crypto.enabled' is true, 'payment.crypto.payer' must be provided. Support for not providing a payer is not yet implemented." />
                )
            ) : null}
        </View>
    );
}

function havePropsChanged(
    parentProps: CrossmintEmbeddedCheckoutV3Props,
    currentRefProps: CrossmintEmbeddedCheckoutV3Props
): boolean {
    return JSON.stringify(parentProps) !== JSON.stringify(currentRefProps);
}

function shouldPreserveInitialChain(
    props: CrossmintEmbeddedCheckoutV3Props,
    storedInitialChain: PayerSupportedBlockchains | undefined
): { shouldPreserve: true; updatedPayer: typeof props.payment.crypto.payer } | { shouldPreserve: false } {
    if (props.payment.crypto.payer && storedInitialChain != null) {
        return {
            shouldPreserve: true,
            updatedPayer: {
                ...props.payment.crypto.payer,
                initialChain: storedInitialChain,
            },
        };
    }
    return { shouldPreserve: false };
}

function ThrowError({ message }: { message: string }) {
    throw new Error(message);
    // biome-ignore lint/correctness/noUnreachable: Need a return statement to satisfy JSX return type
    return null;
}
