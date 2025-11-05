import { type ReactNode, useCallback, useRef, useMemo, useEffect, useState, type RefObject } from "react";
import { View } from "react-native";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import {
    environmentUrlConfig,
    signerInboundEvents,
    signerOutboundEvents,
    SignerErrorCode,
} from "@crossmint/client-signers";
import { validateAPIKey, type UIConfig } from "@crossmint/common-sdk-base";
import {
    CrossmintWalletUIBaseProvider,
    type UIRenderProps,
    type CreateOnLogin,
    useCrossmint,
} from "@crossmint/client-sdk-react-base";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { PhoneSignersDialog } from "@/components/signers/PhoneSignersDialog";

export interface CrossmintWalletProviderProps {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    appearance?: UIConfig;
    /** When true (default), no UI is rendered and signing flows must be handled manually. When false, built-in UI components are rendered. */
    headlessSigningFlow?: boolean;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
}

function CrossmintWalletProviderInternal({
    children,
    createOnLogin,
    appearance,
    headlessSigningFlow = true,
    callbacks,
}: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const { apiKey, appId } = crossmint;

    const parsedAPIKey = useMemo(() => {
        const result = validateAPIKey(apiKey);
        if (!result.isValid) {
            throw new Error("Invalid API key");
        }
        return result;
    }, [apiKey]);

    const frameUrl = useMemo(() => {
        return environmentUrlConfig[parsedAPIKey.environment];
    }, [parsedAPIKey.environment]);

    const webviewRef = useRef<WebView>(null);
    const webViewParentRef = useRef<WebViewParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null>(
        null
    );

    const [needsWebView, setNeedsWebView] = useState<boolean>(false);

    const secureGlobals = useMemo(() => {
        if (appId != null) {
            return { crossmintAppId: appId };
        }
        return {};
    }, [appId]);

    useEffect(() => {
        if (webviewRef.current != null && webViewParentRef.current == null) {
            webViewParentRef.current = new WebViewParent(webviewRef as RefObject<WebView>, {
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
                recovery: {
                    recoverableErrorCodes: [SignerErrorCode.IndexedDbFatal],
                },
            });
        }
    }, [needsWebView]);

    const onWebViewLoad = useCallback(async () => {
        const parent = webViewParentRef.current;
        if (parent != null) {
            try {
                parent.isConnected = false;
                await parent.handshakeWithChild();
            } catch (e) {
                console.error("[CrossmintWalletProvider] Handshake error:", e);
            }
        }
    }, []);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
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
                    } catch {
                        return argStr;
                    }
                });

                const prefix = `[WebView:${consoleMethod.toUpperCase()}]`;
                switch (consoleMethod) {
                    case "log":
                        console.log(prefix, ...args);
                        break;
                    case "error":
                        console.error(prefix, ...args);
                        break;
                    case "warn":
                        console.warn(prefix, ...args);
                        break;
                    case "info":
                        console.info(prefix, ...args);
                        break;
                    default:
                        console.log(`[WebView Unknown:${consoleMethod}]`, ...args);
                }
                return;
            }
        } catch {}

        parent.handleMessage(event);
    }, []);

    const getClientTEEConnection = () => {
        if (webViewParentRef.current == null) {
            throw new Error("WebView not ready or handshake incomplete");
        }
        return webViewParentRef.current;
    };

    const renderNativeUI = ({ emailSignerProps, phoneSignerProps }: UIRenderProps) => {
        return (
            <>
                <EmailSignersDialog {...emailSignerProps} />
                <PhoneSignersDialog {...phoneSignerProps} />
            </>
        );
    };

    const initializeWebView = async () => {
        setNeedsWebView(true);
        let attempts = 0;
        const maxAttempts = 100; // 5 seconds total with 50ms intervals
        while (webViewParentRef.current == null && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            attempts++;
        }

        if (webViewParentRef.current == null) {
            throw new Error("WebView not ready or handshake incomplete");
        }
    };

    return (
        <CrossmintWalletUIBaseProvider
            createOnLogin={createOnLogin}
            appearance={appearance}
            headlessSigningFlow={headlessSigningFlow}
            initializeWebView={initializeWebView}
            callbacks={callbacks}
            renderUI={headlessSigningFlow ? undefined : renderNativeUI}
            clientTEEConnection={getClientTEEConnection}
        >
            {children}

            {needsWebView && (
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
                        globals={secureGlobals}
                        onLoadEnd={onWebViewLoad}
                        onMessage={handleMessage}
                        onError={(syntheticEvent) => {
                            console.error("[CrossmintWalletProvider] WebView error:", syntheticEvent.nativeEvent);
                        }}
                        onHttpError={(syntheticEvent) => {
                            console.error("[CrossmintWalletProvider] WebView HTTP error:", syntheticEvent.nativeEvent);
                        }}
                        onContentProcessDidTerminate={() => webviewRef.current?.reload()}
                        onRenderProcessGone={() => webviewRef.current?.reload()}
                        style={{
                            width: 1,
                            height: 1,
                        }}
                        javaScriptCanOpenWindowsAutomatically={false}
                        thirdPartyCookiesEnabled={false}
                        sharedCookiesEnabled={false}
                        incognito={false}
                        setSupportMultipleWindows={false}
                        originWhitelist={[environmentUrlConfig[parsedAPIKey.environment]]}
                        cacheEnabled={true}
                        cacheMode="LOAD_DEFAULT"
                    />
                </View>
            )}
        </CrossmintWalletUIBaseProvider>
    );
}

export function CrossmintWalletProvider(props: CrossmintWalletProviderProps) {
    return <CrossmintWalletProviderInternal {...props} />;
}
