import { type ReactNode, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { View } from "react-native";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { CrossmintWalletProvider as BaseCrossmintWalletProvider } from "@crossmint/client-sdk-react-base";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import { useCrossmint } from "@/hooks";

const DEFAULT_SECURE_ENDPOINT_URL = "https://signers.crossmint.com";

export interface CrossmintWalletProviderProps {
    children: ReactNode;
    debug?: boolean;
}

export function CrossmintWalletProvider({ children, debug = false }: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const { apiKey, appId } = crossmint;
    const parsedAPIKey = validateAPIKey(apiKey);
    if (!parsedAPIKey.isValid) {
        throw new Error("Invalid API key");
    }
    const frameUrl = `${DEFAULT_SECURE_ENDPOINT_URL}/?environment=${parsedAPIKey.environment}`;

    const webviewRef = useRef<WebView>(null);
    const webViewParentRef = useRef<WebViewParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null>(
        null
    );
    const [isWebViewReady, setIsWebViewReady] = useState(false);

    const injectedGlobalsScript = useMemo(() => {
        if (appId != null) {
            return `window.crossmintAppId = '${appId}';`;
        }
        return "";
    }, [appId]);

    useEffect(() => {
        if (webviewRef.current != null && webViewParentRef.current == null) {
            webViewParentRef.current = new WebViewParent(webviewRef, {
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
            });
        }
    }, []);

    const onWebViewLoad = useCallback(async () => {
        const parent = webViewParentRef.current;
        if (parent != null) {
            try {
                await parent.handshakeWithChild();
                setIsWebViewReady(true);
            } catch (e) {
                console.error("[CrossmintWalletProvider] Handshake error:", e);
                setIsWebViewReady(false);
            }
        }
    }, []);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
        if (debug) {
            console.log("[CrossmintWalletProvider] Received message:", event.nativeEvent.data);
        }
        const parent = webViewParentRef.current;
        if (parent == null) {
            return;
        }

        try {
            const messageData = JSON.parse(event.nativeEvent.data);
            if (messageData && typeof messageData.type === "string" && messageData.type.startsWith("console.")) {
                const consoleMethod = messageData.type.split(".")[1];
                const args = (messageData.data || []).map((argStr: string) => {
                    try {
                        if (
                            argStr === "[Function]" ||
                            argStr === "[Circular Reference]" ||
                            argStr === "[Unserializable Object]"
                        ) {
                            return argStr;
                        }
                        return JSON.parse(argStr);
                    } catch (e) {
                        return argStr;
                    }
                });

                const prefix = `[WebView:${consoleMethod.toUpperCase()}]`;
                switch (consoleMethod) {
                    case "log":
                        if (debug) {
                            console.log(prefix, ...args);
                        }
                        break;
                    case "error":
                        console.error(prefix, ...args);
                        break;
                    case "warn":
                        console.warn(prefix, ...args);
                        break;
                    case "info":
                        if (debug) {
                            console.info(prefix, ...args);
                        }
                        break;
                    default:
                        if (debug) {
                            console.log(`[WebView Unknown:${consoleMethod}]`, ...args);
                        }
                }
                return;
            }
        } catch (_) {}

        parent.handleMessage(event);
    }, [debug]);

    // Get the handshake parent for email signer
    const getHandshakeParent = useCallback(() => {
        if (!isWebViewReady || webViewParentRef.current == null) {
            throw new Error("WebView not ready or handshake incomplete");
        }
        return webViewParentRef.current;
    }, [isWebViewReady]);

    return (
        <BaseCrossmintWalletProvider getHandshakeParent={getHandshakeParent}>
            {children}
            <View
                style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                }}
            >
                <RNWebView
                    ref={webviewRef}
                    source={{ uri: frameUrl }}
                    injectedGlobals={injectedGlobalsScript}
                    onLoadStart={(event) => {
                        if (debug) {
                            console.log("[CrossmintWalletProvider] WebView onLoadStart:", event.nativeEvent.url);
                        }
                    }}
                    onLoadEnd={onWebViewLoad}
                    onLoadProgress={({ nativeEvent }) => {
                        if (debug) {
                            console.log("[CrossmintWalletProvider] WebView loading progress:", nativeEvent.progress);
                        }
                    }}
                    onMessage={handleMessage}
                    onError={(syntheticEvent) => {
                        const errorMessage = syntheticEvent.nativeEvent.description || '';
                        if (errorMessage.includes('AttestationService') || errorMessage.includes('XMIF')) {
                            console.warn("[CrossmintWalletProvider] WebView attestation service error (non-critical):", errorMessage);
                        } else {
                            console.error("[CrossmintWalletProvider] WebView error:", syntheticEvent.nativeEvent);
                        }
                        setIsWebViewReady(false);
                    }}
                    onHttpError={(syntheticEvent) => {
                        console.error("[CrossmintWalletProvider] WebView HTTP error:", syntheticEvent.nativeEvent);
                        setIsWebViewReady(false);
                    }}
                    style={{
                        width: 1,
                        height: 1,
                    }}
                    javaScriptCanOpenWindowsAutomatically={false}
                    thirdPartyCookiesEnabled={false}
                    sharedCookiesEnabled={false}
                    incognito={false}
                    setSupportMultipleWindows={false}
                    originWhitelist={[DEFAULT_SECURE_ENDPOINT_URL]}
                />
            </View>
        </BaseCrossmintWalletProvider>
    );
}
