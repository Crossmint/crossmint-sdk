import { type ReactNode, useCallback, useEffect, useRef, useState, useMemo, createContext } from "react";
import { View } from "react-native";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import { useCrossmint } from "@/hooks";
import { CrossmintWalletBaseProvider } from "@crossmint/client-sdk-react-base";

const DEFAULT_SECURE_ENDPOINT_URL = "https://signers.crossmint.com";

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
}

export function CrossmintWalletProvider({ children }: CrossmintWalletProviderProps) {
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
    const [needsAuthState, setNeedsAuthState] = useState<boolean>(false);
    const sendEmailWithOtpRef = useRef<() => Promise<void>>(throwNotAvailable("sendEmailWithOtp"));
    const verifyOtpRef = useRef<(otp: string) => Promise<void>>(throwNotAvailable("verifyOtp"));
    const rejectRef = useRef<(error?: Error) => void>(throwNotAvailable("reject"));

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
        console.log("[CrossmintWalletProvider] Received message:", event.nativeEvent.data);
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

    // Get the handshake parent for email signer
    const getHandshakeParent = useCallback(() => {
        if (!isWebViewReady || webViewParentRef.current == null) {
            throw new Error("WebView not ready or handshake incomplete");
        }
        return webViewParentRef.current;
    }, [isWebViewReady]);

    const onAuthRequired = async (
        needsAuth: boolean,
        sendEmailWithOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => {
        setNeedsAuthState(needsAuth);
        sendEmailWithOtpRef.current = sendEmailWithOtp;
        verifyOtpRef.current = verifyOtp;
        rejectRef.current = reject;
    };

    const authContextValue = useMemo(
        () => ({
            needsAuth: needsAuthState,
            sendEmailWithOtp: sendEmailWithOtpRef.current,
            verifyOtp: verifyOtpRef.current,
            reject: rejectRef.current,
        }),
        [needsAuthState]
    );

    return (
        <CrossmintWalletBaseProvider onAuthRequired={onAuthRequired} getHandshakeParent={getHandshakeParent}>
            <CrossmintWalletEmailSignerContext.Provider value={authContextValue}>
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
                            console.log("[CrossmintWalletProvider] WebView onLoadStart:", event.nativeEvent.url);
                        }}
                        onLoadEnd={onWebViewLoad}
                        onLoadProgress={({ nativeEvent }) => {
                            console.log("[CrossmintWalletProvider] WebView loading progress:", nativeEvent.progress);
                        }}
                        onMessage={handleMessage}
                        onError={(syntheticEvent) => {
                            console.error("[CrossmintWalletProvider] WebView error:", syntheticEvent.nativeEvent);
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
            </CrossmintWalletEmailSignerContext.Provider>
        </CrossmintWalletBaseProvider>
    );
}
