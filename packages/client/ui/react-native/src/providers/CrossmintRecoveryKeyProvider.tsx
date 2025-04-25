import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from "react";
import bs58 from "bs58";
import { PublicKey, type VersionedTransaction } from "@solana/web3.js";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebView, WebViewParent } from "@crossmint/client-sdk-rn-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { useCrossmint } from "../hooks";
import { View } from "react-native";

export interface RecoverySigner {
    type: "solana-keypair";
    address: string;
    signer: {
        signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    };
}

export interface CrossmintRecoveryKeyContextState {
    isWebViewReady: boolean;
    recoverySigner: RecoverySigner | null;
    experimental_createRecoveryKeySigner: (authId: string) => Promise<void>;
    experimental_validateEmailOtp: (encryptedOtp: string) => Promise<string | null>;
}

export const CrossmintRecoveryKeyContext = createContext<CrossmintRecoveryKeyContextState | null>(null);

export function useCrossmintRecoveryKey() {
    const context = useContext(CrossmintRecoveryKeyContext);
    if (context == null) {
        throw new Error("useCrossmintRecoveryKey must be used within a CrossmintRecoveryKeyProvider");
    }
    return context;
}

export interface CrossmintRecoveryKeyProviderProps {
    children: ReactNode;
    secureEndpointUrl?: string;
}

const defaultEventOptions = {
    timeoutMs: 10_000,
    intervalMs: 5_000,
};

const DEFAULT_SECURE_ENDPOINT_URL = "https://crossmint-signer-frames.onrender.com";

export function CrossmintRecoveryKeyProvider({
    children,
    secureEndpointUrl = DEFAULT_SECURE_ENDPOINT_URL,
}: CrossmintRecoveryKeyProviderProps) {
    const {
        crossmint: { apiKey, jwt },
    } = useCrossmint();

    const webviewRef = useRef<WebView>(null);
    const webViewParentRef = useRef<WebViewParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null>(
        null
    );
    const [recoverySigner, setRecoverySigner] = useState<RecoverySigner | null>(null);
    const [isWebViewReady, setIsWebViewReady] = useState(false);

    useEffect(() => {
        if (webviewRef.current != null && !webViewParentRef.current == null) {
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
            } catch (_) {
                setIsWebViewReady(false);
            }
        }
    }, []);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
        const parent = webViewParentRef.current;
        if (parent == null) {
            return;
        }
        parent.handleMessage(event);
    }, []);

    const buildRecoverySigner = useCallback(
        (address: string): RecoverySigner => {
            const parent = webViewParentRef.current;
            if (parent == null || jwt == null || apiKey == null) {
                throw new Error("Cannot build signer: Missing prerequisites (parent, jwt, apiKey).");
            }

            return {
                type: "solana-keypair",
                address,
                signer: {
                    signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
                        try {
                            const response = await parent.sendAction({
                                event: "request:sign-message",
                                responseEvent: "response:sign-message",
                                data: {
                                    authData: { jwt, apiKey },
                                    data: { message: bs58.encode(message), chainLayer: "solana", encoding: "base58" },
                                },
                                options: defaultEventOptions,
                            });
                            if (response == null || response.status === "error" || response.signature == null) {
                                throw new Error("Failed to sign message");
                            }
                            return bs58.decode(response.signature);
                        } catch (err) {
                            throw err;
                        }
                    },
                    signTransaction: async (transaction: VersionedTransaction): Promise<VersionedTransaction> => {
                        try {
                            const response = await parent.sendAction({
                                event: "request:sign-transaction",
                                responseEvent: "response:sign-transaction",
                                data: {
                                    authData: { jwt, apiKey },
                                    data: {
                                        transaction: bs58.encode(transaction.serialize()),
                                        chainLayer: "solana",
                                        encoding: "base58",
                                    },
                                },
                                options: defaultEventOptions,
                            });
                            if (response == null || response.status === "error" || response.signature == null) {
                                throw new Error("Failed to sign transaction: No signature returned");
                            }
                            transaction.addSignature(new PublicKey(address), bs58.decode(response.signature));
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
        async (authId: string) => {
            const parent = webViewParentRef.current;
            if (parent == null || !isWebViewReady) {
                const message = "WebViewParent not ready or handshake incomplete.";
                throw new Error(message);
            }
            if (jwt == null || apiKey == null) {
                const message = "Missing authentication credentials (JWT or API Key).";
                throw new Error(message);
            }

            try {
                const response = await parent.sendAction({
                    event: "request:create-signer",
                    responseEvent: "response:create-signer",
                    data: {
                        authData: { jwt, apiKey },
                        data: { authId, chainLayer: "solana" },
                    },
                    options: defaultEventOptions,
                });
                if (response?.status === "success" && response.address) {
                    const newSigner = buildRecoverySigner(response.address);
                    setRecoverySigner(newSigner);
                }
            } catch (err) {
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
                const message = "WebViewParent not ready or handshake incomplete.";
                throw new Error(message);
            }
            if (jwt == null || apiKey == null) {
                const message = "Missing authentication credentials (JWT or API Key).";
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

                if (response == null || response.status === "error" || response.address == null) {
                    throw new Error("Failed to validate encrypted OTP");
                }

                const newSigner = buildRecoverySigner(response.address);
                setRecoverySigner(newSigner);
                return response.address;
            } catch (_) {
                return null;
            }
        },
        [isWebViewReady, jwt, apiKey, buildRecoverySigner]
    );

    const contextValue = useMemo(
        () => ({
            isWebViewReady,
            recoverySigner,
            experimental_createRecoveryKeySigner,
            experimental_validateEmailOtp,
        }),
        [isWebViewReady, recoverySigner, experimental_createRecoveryKeySigner, experimental_validateEmailOtp]
    );

    return (
        <CrossmintRecoveryKeyContext.Provider value={contextValue}>
            {children}
            <View style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
                <RNWebView
                    ref={webviewRef}
                    source={{ uri: secureEndpointUrl }}
                    onLoadEnd={onWebViewLoad}
                    onMessage={handleMessage}
                    onError={() => setIsWebViewReady(false)}
                    onHttpError={() => setIsWebViewReady(false)}
                    style={{
                        width: 1,
                        height: 1,
                    }}
                />
            </View>
        </CrossmintRecoveryKeyContext.Provider>
    );
}
