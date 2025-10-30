import { type ReactNode, useCallback, useEffect, useRef, useMemo, createContext, useState } from "react";
import { View } from "react-native";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { WebView as RNRawWebView } from "react-native-webview";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { environmentUrlConfig, signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import { type CreateOnLogin, CrossmintWalletBaseProvider } from "@crossmint/client-sdk-react-base";
import { useCrossmint } from "@/hooks";
import { WebViewShadowSignerStorage } from "@/utils/WebViewShadowSignerStorage";
import { SHADOW_SIGNER_STORAGE_INJECTED_JS } from "@/utils/webview-shadow-signer-storage-injected";

const throwNotAvailable = (functionName: string) => () => {
    throw new Error(`${functionName} is not available. Make sure you're using an email signer wallet.`);
};

type CrossmintWalletEmailSignerContext = {
    needsAuth: boolean;
    sendEmailWithOtp: () => Promise<void>;
    verifyOtp: (otp: string) => Promise<void>;
    reject: (error?: Error) => void;
};

// Create the auth context
export const CrossmintWalletEmailSignerContext = createContext<CrossmintWalletEmailSignerContext>({
    needsAuth: false,
    sendEmailWithOtp: throwNotAvailable("sendEmailWithOtp"),
    verifyOtp: throwNotAvailable("verifyOtp"),
    reject: throwNotAvailable("reject"),
});

export interface CrossmintWalletProviderProps {
    children: ReactNode;
    createOnLogin?: CreateOnLogin;
    callbacks?: {
        onWalletCreationStart?: () => Promise<void>;
        onTransactionStart?: () => Promise<void>;
    };
}

export function CrossmintWalletProvider({ children, createOnLogin, callbacks }: CrossmintWalletProviderProps) {
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

    const shadowSignerStorage = useMemo(() => new WebViewShadowSignerStorage(), []);

    const webviewRef = useRef<WebView>(null);
    const webViewParentRef = useRef<WebViewParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null>(
        null
    );

    const shadowSignerWebViewRef = useRef<WebView>(null);
    const [shadowSignerHash, setShadowSignerHash] = useState<string>("");
    const shadowSignerBaseUrl = "https://crossmint-shadow-signer.local";

    // Use useState only for needsAuth since it needs to trigger re-renders
    const [needsAuth, setNeedsAuth] = useState<boolean>(false);

    const [needsWebView, setNeedsWebView] = useState<boolean>(false);

    // Keep functions as refs to avoid unnecessary re-renders
    const sendEmailWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const rejectRef = useRef<(error?: Error) => void>(throwNotAvailable("reject"));

    const secureGlobals = useMemo(() => {
        if (appId != null) {
            return { crossmintAppId: appId };
        }
        return {};
    }, [appId]);

    useEffect(() => {
        if (webviewRef.current != null && webViewParentRef.current == null) {
            webViewParentRef.current = new WebViewParent(webviewRef, {
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
            });
        }
    }, [needsWebView, webviewRef.current]);

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

    const onShadowSignerWebViewLoad = useCallback(() => {
        if (shadowSignerStorage instanceof WebViewShadowSignerStorage && shadowSignerWebViewRef.current) {
            console.log("[ShadowSignerStorage] WebView loaded (pre-injected script)");
            shadowSignerStorage.initialize(shadowSignerWebViewRef, (hash: string) => setShadowSignerHash(hash));
        }
    }, [shadowSignerStorage]);

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
        } catch (_) {}

        parent.handleMessage(event);
    }, []);

    const handleShadowSignerMessage = useCallback(
        (event: WebViewMessageEvent) => {
            if (shadowSignerStorage instanceof WebViewShadowSignerStorage) {
                shadowSignerStorage.handleMessage(event);
            }
        },
        [shadowSignerStorage]
    );

    const getClientTEEConnection = () => {
        if (webViewParentRef.current == null) {
            throw new Error("WebView not ready or handshake incomplete");
        }
        return webViewParentRef.current;
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
            throw new Error("Email/Phone signer WebView not ready or handshake incomplete");
        }

        if (shadowSignerStorage instanceof WebViewShadowSignerStorage) {
            console.log("[initializeWebView] Waiting for shadow signer WebView to be ready...");
            await shadowSignerStorage.waitForReady();
        }
    };

    const onAuthRequired = async (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => {
        setNeedsAuth(needsAuth);
        sendEmailWithOtpRef.current = sendEmailWithOtp;
        verifyOtpRef.current = verifyOtp;
        rejectRef.current = reject;
    };

    const authContextValue = useMemo(
        () => ({
            needsAuth,
            sendEmailWithOtp: sendEmailWithOtpRef.current,
            verifyOtp: verifyOtpRef.current,
            reject: rejectRef.current,
        }),
        [needsAuth]
    );

    return (
        <CrossmintWalletBaseProvider
            createOnLogin={createOnLogin}
            onAuthRequired={onAuthRequired}
            clientTEEConnection={getClientTEEConnection}
            initializeWebView={initializeWebView}
            callbacks={callbacks}
            shadowSignerStorage={shadowSignerStorage}
        >
            <CrossmintWalletEmailSignerContext.Provider value={authContextValue}>
                {children}
            </CrossmintWalletEmailSignerContext.Provider>
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
            {needsWebView && (
                <View
                    style={{
                        position: "absolute",
                        width: 0,
                        height: 0,
                        overflow: "hidden",
                    }}
                >
                    <RNRawWebView
                        ref={shadowSignerWebViewRef}
                        source={{
                            html: "<html><head></head><body></body></html>",
                            baseUrl: `${shadowSignerBaseUrl}${shadowSignerHash}`,
                        }}
                        onLoadEnd={onShadowSignerWebViewLoad}
                        onMessage={handleShadowSignerMessage}
                        onError={(syntheticEvent) => {
                            console.error("[ShadowSignerStorage] WebView error:", syntheticEvent.nativeEvent);
                        }}
                        style={{
                            width: 1,
                            height: 1,
                        }}
                        javaScriptEnabled={true}
                        incognito={false}
                        cacheEnabled={true}
                        cacheMode="LOAD_DEFAULT"
                        injectedJavaScriptBeforeContentLoaded={SHADOW_SIGNER_STORAGE_INJECTED_JS}
                    />
                </View>
            )}
        </CrossmintWalletBaseProvider>
    );
}
