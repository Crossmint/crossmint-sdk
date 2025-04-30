import React, {
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    useMemo,
} from "react";
import bs58 from "bs58";
import { PublicKey, type VersionedTransaction } from "@solana/web3.js";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebView } from "@crossmint/client-sdk-rn-window";
import { WebViewParent } from "@crossmint/client-sdk-rn-window";
import {
    signerInboundEvents,
    signerOutboundEvents,
} from "@crossmint/client-signers";
import { useCrossmint } from "../hooks";
import { View } from "react-native";

export interface RecoverySigner {
    type: "solana-keypair";
    address: string;
    signer: {
        signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        signTransaction: (
            transaction: VersionedTransaction
        ) => Promise<VersionedTransaction>;
    };
}

type RecoveryKeyStatus =
    | "not-loaded"
    | "frame-loaded"
    | "awaiting-otp-validation"
    | "loaded";

export interface CrossmintRecoveryKeyContextState {
    experimental_recoveryKeyStatus: RecoveryKeyStatus;
    experimental_recoverySigner: RecoverySigner | null;
    experimental_createRecoveryKeySigner: (
        authId: string
    ) => Promise<RecoverySigner | null>;
    experimental_validateEmailOtp: (
        encryptedOtp: string
    ) => Promise<string | null>;
}

export const CrossmintRecoveryKeyContext =
    React.createContext<CrossmintRecoveryKeyContextState | null>(null);

export function useCrossmintRecoveryKey() {
    const context = useContext(CrossmintRecoveryKeyContext);
    if (context == null) {
        throw new Error(
            "useCrossmintRecoveryKey must be used within a CrossmintRecoveryKeyProvider"
        );
    }
    return context;
}

export interface CrossmintRecoveryKeyProviderProps {
    children: ReactNode;
    experimental_secureEndpointUrl?: string;
}

const defaultEventOptions = {
    timeoutMs: 10_000,
    intervalMs: 5_000,
};

const DEFAULT_SECURE_ENDPOINT_URL =
    "https://crossmint-signer-frames.onrender.com";

export function CrossmintRecoveryKeyProvider({
    children,
    experimental_secureEndpointUrl = DEFAULT_SECURE_ENDPOINT_URL,
}: CrossmintRecoveryKeyProviderProps) {
    const {
        crossmint: { apiKey, jwt, appId },
    } = useCrossmint();

    const webviewRef = useRef<WebView>(null);
    const webViewParentRef = useRef<WebViewParent<
        typeof signerOutboundEvents,
        typeof signerInboundEvents
    > | null>(null);
    const [experimental_recoverySigner, setRecoverySigner] =
        useState<RecoverySigner | null>(null);
    const [isWebViewReady, setIsWebViewReady] = useState(false);
    const [experimental_recoveryKeyStatus, setRecoveryKeyStatus] =
        useState<RecoveryKeyStatus>("not-loaded");

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
        if (webViewParentRef.current != null) {
            try {
                await webViewParentRef.current.handshakeWithChild();
                setIsWebViewReady(true);
                setRecoveryKeyStatus("frame-loaded");
            } catch (e) {
                console.error("[RN] handshakeWithChild error:", e);
                setIsWebViewReady(false);
                setRecoveryKeyStatus("not-loaded");
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
            if (
                messageData &&
                typeof messageData.type === "string" &&
                messageData.type.startsWith("console.")
            ) {
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
                        console.log(
                            `[WebView Unknown:${consoleMethod}]`,
                            ...args
                        );
                }
                return;
            }
        } catch (_) {}

        parent.handleMessage(event);
    }, []);

    const buildRecoverySigner = useCallback(
        (address: string): RecoverySigner => {
            const parent = webViewParentRef.current;
            if (parent == null || jwt == null || apiKey == null) {
                throw new Error(
                    "Cannot build signer: Missing prerequisites (parent, jwt, apiKey)."
                );
            }

            return {
                type: "solana-keypair",
                address,
                signer: {
                    signMessage: async (
                        message: Uint8Array
                    ): Promise<Uint8Array> => {
                        try {
                            const response = await parent.sendAction({
                                event: "request:sign",
                                responseEvent: "response:sign",
                                data: {
                                    authData: { jwt, apiKey },
                                    data: {
                                        bytes: bs58.encode(message),
                                        keyType: "ed25519",
                                        encoding: "base58",
                                    },
                                },
                                options: defaultEventOptions,
                            });
                            if (
                                response == null ||
                                response.status === "error" ||
                                response.signature == null
                            ) {
                                throw new Error("Failed to sign message");
                            }
                            return bs58.decode(response.signature);
                        } catch (err) {
                            throw err;
                        }
                    },
                    signTransaction: async (
                        transaction: VersionedTransaction
                    ): Promise<VersionedTransaction> => {
                        try {
                            const messageData = transaction.message.serialize();
                            const response = await parent.sendAction({
                                event: "request:sign",
                                responseEvent: "response:sign",
                                data: {
                                    authData: { jwt, apiKey },
                                    data: {
                                        bytes: bs58.encode(messageData),
                                        keyType: "ed25519",
                                        encoding: "base58",
                                    },
                                },
                                options: defaultEventOptions,
                            });
                            if (
                                response == null ||
                                response.status === "error" ||
                                response.signature == null
                            ) {
                                throw new Error(
                                    "Failed to sign transaction: No signature returned"
                                );
                            }
                            transaction.addSignature(
                                new PublicKey(address),
                                bs58.decode(response.signature)
                            );
                            return transaction;
                        } catch (err) {
                            throw err;
                        }
                    },
                },
            };
        },
        [jwt, apiKey]
    );

    const experimental_createRecoveryKeySigner = useCallback(
        async (authId: string): Promise<RecoverySigner | null> => {
            const parent = webViewParentRef.current;
            if (parent == null || !isWebViewReady) {
                const message =
                    "WebViewParent not ready or handshake incomplete.";
                throw new Error(message);
            }
            if (jwt == null || apiKey == null) {
                const message =
                    "Missing authentication credentials (JWT or API Key).";
                throw new Error(message);
            }

            const prefixedAuthId = authId.startsWith("email:")
                ? authId
                : `email:${authId}`;

            try {
                const response = await parent.sendAction({
                    event: "request:create-signer",
                    responseEvent: "response:create-signer",
                    data: {
                        authData: { jwt, apiKey },
                        data: { authId: prefixedAuthId, chainLayer: "solana" },
                    },
                    options: defaultEventOptions,
                });

                if (response?.status === "success" && response.address) {
                    const newSigner = buildRecoverySigner(response.address);
                    setRecoverySigner(newSigner);
                    setRecoveryKeyStatus("loaded");
                    return newSigner;
                }

                setRecoveryKeyStatus("awaiting-otp-validation");
                return null;
            } catch (err) {
                setRecoveryKeyStatus("not-loaded");
                throw err;
            }
        },
        [isWebViewReady, jwt, apiKey, buildRecoverySigner]
    );

    const experimental_validateEmailOtp = useCallback(
        async (encryptedOtp: string): Promise<string | null> => {
            setRecoverySigner(null);

            const parent = webViewParentRef.current;
            if (parent == null || !isWebViewReady) {
                const message =
                    "WebViewParent not ready or handshake incomplete.";
                throw new Error(message);
            }
            if (jwt == null || apiKey == null) {
                const message =
                    "Missing authentication credentials (JWT or API Key).";
                throw new Error(message);
            }

            try {
                const response = await parent.sendAction({
                    event: "request:send-otp",
                    responseEvent: "response:send-otp",
                    data: {
                        authData: { jwt, apiKey },
                        data: { chainLayer: "solana", encryptedOtp },
                    },
                    options: defaultEventOptions,
                });

                if (
                    response == null ||
                    response.status === "error" ||
                    response.address == null
                ) {
                    throw new Error("Failed to validate encrypted OTP");
                }

                const newSigner = buildRecoverySigner(response.address);
                setRecoverySigner(newSigner);
                setRecoveryKeyStatus("loaded");
                return response.address;
            } catch (_) {
                setRecoveryKeyStatus("not-loaded");
                return null;
            }
        },
        [isWebViewReady, jwt, apiKey, buildRecoverySigner]
    );

    const contextValue = useMemo(
        () => ({
            experimental_recoveryKeyStatus,
            experimental_recoverySigner,
            experimental_createRecoveryKeySigner,
            experimental_validateEmailOtp,
        }),
        [
            experimental_recoveryKeyStatus,
            experimental_recoverySigner,
            experimental_createRecoveryKeySigner,
            experimental_validateEmailOtp,
        ]
    );

    return (
        <CrossmintRecoveryKeyContext.Provider value={contextValue}>
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
                    source={{ uri: experimental_secureEndpointUrl }}
                    onLoadEnd={onWebViewLoad}
                    onMessage={handleMessage}
                    onError={() => setIsWebViewReady(false)}
                    onHttpError={() => setIsWebViewReady(false)}
                    style={{
                        width: 1,
                        height: 1,
                    }}
                    injectedGlobals={injectedGlobalsScript}
                />
            </View>
        </CrossmintRecoveryKeyContext.Provider>
    );
}
