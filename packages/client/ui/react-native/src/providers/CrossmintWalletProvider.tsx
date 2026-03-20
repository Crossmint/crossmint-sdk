import { type ReactNode, useCallback, useRef, useMemo, useEffect, useState, type RefObject } from "react";
import { Platform, View } from "react-native";
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
import type { DeviceSignerKeyStorage } from "@crossmint/wallets-sdk";
import { createDeviceSignerKeyStorage } from "@crossmint/expo-device-signer";

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
    /**
     * Storage implementation for device signer keys. Defaults to `NativeDeviceSignerKeyStorage`
     * (Secure Enclave on iOS, Android Keystore on Android). Override for testing or custom storage.
     */
    deviceSignerKeyStorage?: DeviceSignerKeyStorage;
    /** @internal */
    children: ReactNode;
}

function CrossmintWalletProviderInternal({
    children,
    createOnLogin,
    appearance,
    headlessSigningFlow = true,
    callbacks,
    deviceSignerKeyStorage: deviceSignerKeyStorageProp,
}: CrossmintWalletProviderProps) {
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally captures the initial value once to stabilize the reference
    const deviceSignerKeyStorage = useMemo(
        () => deviceSignerKeyStorageProp ?? createDeviceSignerKeyStorage(), // eslint-disable-line react-hooks/exhaustive-deps
        []
    );
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
    const handshakeTriggeredRef = useRef<boolean>(false);
    const handshakeInProgressRef = useRef<boolean>(false);
    const handshakeGenerationRef = useRef<number>(0);
    const handshakeStartTimeRef = useRef<number>(0);

    const secureGlobals = useMemo(() => {
        if (appId != null) {
            return { crossmintAppId: appId };
        }
        return {};
    }, [appId]);

    const performHandshake = useCallback(
        async (trigger: "frame-ready" | "onLoadEnd" | "eager") => {
            if (webViewParentRef.current != null) {
                const parent = webViewParentRef.current;

                // Prevent concurrent or duplicate handshakes
                if (handshakeInProgressRef.current) {
                    logger.info("react-native.wallet.webview.handshake.skip.in-progress", {
                        trigger,
                        generation: handshakeGenerationRef.current,
                    });
                    return;
                }
                if (handshakeTriggeredRef.current && parent.isConnected) {
                    logger.info("react-native.wallet.webview.handshake.skip.already-connected", {
                        trigger,
                        generation: handshakeGenerationRef.current,
                    });
                    return;
                }

                handshakeInProgressRef.current = true;
                const handshakeStartTime = Date.now();
                handshakeStartTimeRef.current = handshakeStartTime;
                const generation = handshakeGenerationRef.current;
                try {
                    logger.info("react-native.wallet.webview.handshake.start", {
                        trigger,
                        generation,
                        platform: Platform.OS,
                    });
                    handshakeTriggeredRef.current = true;
                    parent.isConnected = false;
                    await parent.handshakeWithChild();
                    const durationMs = Date.now() - handshakeStartTime;
                    logger.info("react-native.wallet.webview.handshake.success", {
                        trigger,
                        generation,
                        durationMs,
                    });
                } catch (e) {
                    const durationMs = Date.now() - handshakeStartTime;
                    if (generation === handshakeGenerationRef.current) {
                        handshakeTriggeredRef.current = false;
                    }
                    logger.error("react-native.wallet.webview.handshake.error", {
                        trigger,
                        generation,
                        durationMs,
                        error: e instanceof Error ? e.message : String(e),
                    });
                    console.error("[CrossmintWalletProvider] Handshake error:", e);
                } finally {
                    if (generation === handshakeGenerationRef.current) {
                        handshakeInProgressRef.current = false;
                    }
                }
            } else {
                logger.warn("react-native.wallet.webview.handshake.skip", {
                    trigger,
                    reason: "parent not initialized",
                });
            }
        },
        [logger]
    );

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

            // Start handshake immediately — don't wait for onLoadEnd or frame-ready.
            // The parent polls handshakeRequest every 100ms for 30s, so by the time
            // the child finishes init and calls handshakeWithParent(), the request
            // will arrive within 100ms. This eliminates the 15-23s gap on slow
            // devices where onLoadEnd fires long after the child is ready.
            performHandshake("eager");
        }
    }, [needsWebView, logger, performHandshake]);

    const onWebViewLoad = useCallback(async () => {
        // onLoadEnd is a fallback — eager handshake should have started already.
        // This still triggers in case the eager start couldn't run (e.g. ref timing).
        logger.info("react-native.wallet.webview.onLoadEnd", {
            handshakeInProgress: handshakeInProgressRef.current,
            isConnected: webViewParentRef.current?.isConnected ?? false,
            generation: handshakeGenerationRef.current,
        });
        await performHandshake("onLoadEnd");
    }, [logger, performHandshake]);

    const handleMessage = useCallback(
        (event: WebViewMessageEvent) => {
            const parent = webViewParentRef.current;
            if (parent == null) {
                return;
            }

            const rawData = event.nativeEvent.data;

            // Handle "frame-ready" signal from child — child is ready to handshake.
            // With eager handshake, the parent is already polling, so the handshake
            // should already be in progress or complete. Log for diagnostics.
            if (rawData === "frame-ready") {
                logger.info("react-native.wallet.webview.frame-ready.received", {
                    handshakeInProgress: handshakeInProgressRef.current,
                    isConnected: webViewParentRef.current?.isConnected ?? false,
                    generation: handshakeGenerationRef.current,
                    msSinceHandshakeStart:
                        handshakeStartTimeRef.current > 0 ? Date.now() - handshakeStartTimeRef.current : null,
                });
                performHandshake("frame-ready");
                return;
            }

            try {
                const messageData = JSON.parse(rawData);
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
        [logger, performHandshake]
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
            deviceSignerKeyStorage={deviceSignerKeyStorage}
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
                        onContentProcessDidTerminate={() => {
                            const prevGeneration = handshakeGenerationRef.current;
                            handshakeGenerationRef.current++;
                            logger.warn("react-native.wallet.webview.process.terminated", {
                                prevGeneration,
                                newGeneration: handshakeGenerationRef.current,
                                wasConnected: webViewParentRef.current?.isConnected ?? false,
                                hadHandshakeInProgress: handshakeInProgressRef.current,
                            });
                            handshakeTriggeredRef.current = false;
                            handshakeInProgressRef.current = false;
                            if (webViewParentRef.current != null) {
                                webViewParentRef.current.isConnected = false;
                            }
                            webviewRef.current?.reload();
                            // Start polling immediately — don't wait for onLoadEnd which fires 15-23s late on slow devices
                            performHandshake("eager");
                        }}
                        onRenderProcessGone={() => {
                            const prevGeneration = handshakeGenerationRef.current;
                            handshakeGenerationRef.current++;
                            logger.warn("react-native.wallet.webview.process.renderGone", {
                                prevGeneration,
                                newGeneration: handshakeGenerationRef.current,
                                wasConnected: webViewParentRef.current?.isConnected ?? false,
                                hadHandshakeInProgress: handshakeInProgressRef.current,
                            });
                            handshakeTriggeredRef.current = false;
                            handshakeInProgressRef.current = false;
                            if (webViewParentRef.current != null) {
                                webViewParentRef.current.isConnected = false;
                            }
                            webviewRef.current?.reload();
                            // Start polling immediately — don't wait for onLoadEnd which fires 15-23s late on slow devices
                            performHandshake("eager");
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
