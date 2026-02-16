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
    CrossmintWalletBaseProvider,
    type UIRenderProps,
    type CreateOnLogin,
    useCrossmint,
} from "@crossmint/client-sdk-react-base";
import { EmailSignersDialog } from "@/components/signers/EmailSignersDialog";
import { PhoneSignersDialog } from "@/components/signers/PhoneSignersDialog";
import { useLogger } from "@crossmint/client-sdk-react-base";
import { LoggerContext } from "./CrossmintProvider";

export interface CrossmintWalletProviderProps {
    /** Wallet configuration for automatic creation on user login. Defines the chain and signer type for the wallet. */
    createOnLogin?: CreateOnLogin;
    /** Optional appearance configuration for styling built-in UI components. */
    appearance?: UIConfig;
    /** When true (default), no UI is rendered and signing flows must be handled manually. When false, built-in UI components are rendered. */
    headlessSigningFlow?: boolean;
    /** Optional lifecycle callbacks invoked during wallet creation and transaction signing. */
    callbacks?: {
        /** Called when a wallet creation flow begins. */
        onWalletCreationStart?: () => Promise<void>;
        /** Called when a transaction signing flow begins. */
        onTransactionStart?: () => Promise<void>;
    };
    /** @internal */
    children: ReactNode;
}

function CrossmintWalletProviderInternal({
    children,
    createOnLogin,
    appearance,
    headlessSigningFlow = true,
    callbacks,
}: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const logger = useLogger(LoggerContext);
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
            logger.info("react-native.wallet.webview.initializing");
            webViewParentRef.current = new WebViewParent(webviewRef as RefObject<WebView>, {
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
                handshakeOptions: {
                    timeoutMs: 30_000,
                    intervalMs: 100,
                },
                recovery: {
                    recoverableErrorCodes: [SignerErrorCode.IndexedDbFatal],
                },
            });
            logger.info("react-native.wallet.webview.initialized");
        }
    }, [needsWebView, logger]);

    const onWebViewLoad = useCallback(async () => {
        const parent = webViewParentRef.current;
        if (parent != null) {
            try {
                logger.info("react-native.wallet.webview.handshake.start");
                parent.isConnected = false;
                await parent.handshakeWithChild();
                logger.info("react-native.wallet.webview.handshake.success");
            } catch (e) {
                logger.error("react-native.wallet.webview.handshake.error", {
                    error: e instanceof Error ? e.message : String(e),
                });
                console.error("[CrossmintWalletProvider] Handshake error:", e);
            }
        }
    }, [logger]);

    const handleMessage = useCallback(
        (event: WebViewMessageEvent) => {
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

                    const logMessage = `react-native.wallet.webview.console.${consoleMethod}`;
                    const logContext = { webview_args: args };

                    switch (consoleMethod) {
                        case "log":
                            logger.info(logMessage, logContext);
                            break;
                        case "error":
                            logger.error(logMessage, logContext);
                            break;
                        case "warn":
                            logger.warn(logMessage, logContext);
                            break;
                        case "info":
                            logger.info(logMessage, logContext);
                            break;
                        case "debug":
                            logger.debug(logMessage, logContext);
                            break;
                        default:
                            logger.info(`react-native.wallet.webview.console.unknown`, {
                                webview_method: consoleMethod,
                                webview_args: args,
                            });
                    }
                    return;
                }
            } catch {}

            parent.handleMessage(event);
        },
        [logger]
    );

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
        logger.info("react-native.wallet.webview.init.start");
        setNeedsWebView(true);
        let attempts = 0;
        const maxAttempts = 100; // 5 seconds total with 50ms intervals
        while (webViewParentRef.current == null && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            attempts++;
        }

        if (webViewParentRef.current == null) {
            logger.error("react-native.wallet.webview.init.timeout", {
                attempts,
            });
            throw new Error("WebView not ready or handshake incomplete");
        }
        logger.info("react-native.wallet.webview.init.success", { attempts });
    };

    return (
        <CrossmintWalletBaseProvider
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
        </CrossmintWalletBaseProvider>
    );
}

/**
 * Provider for wallet creation and management. Must be nested inside {@link CrossmintProvider}.
 * Handles secure communication with the Crossmint signer via a hidden WebView.
 */
export function CrossmintWalletProvider(props: CrossmintWalletProviderProps) {
    return <CrossmintWalletProviderInternal {...props} />;
}
