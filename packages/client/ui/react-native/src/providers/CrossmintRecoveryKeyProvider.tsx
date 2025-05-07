import React, { type ReactNode, useCallback, useContext, useEffect, useRef, useState, useMemo } from "react";
import bs58 from "bs58";
import { PublicKey, type VersionedTransaction } from "@solana/web3.js";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebView } from "@crossmint/client-sdk-rn-window";
import { WebViewParent } from "@crossmint/client-sdk-rn-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import { useCrossmint } from "../hooks";
import { View } from "react-native";
import { validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import { WalletContext as BaseWalletContext } from "@crossmint/client-sdk-react-base";

export interface RecoverySigner {
    type: "solana-keypair";
    address: string;
    signer: {
        signMessage: (message: Uint8Array) => Promise<Uint8Array>;
        signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    };
}

export interface CrossmintRecoveryKeyContextState {
    experimental_needsAuth: boolean;
    experimental_createRecoveryKeySigner: (email: string) => Promise<RecoverySigner | null>;
    experimental_sendEmailWithOtp: (email: string) => Promise<void>;
    experimental_verifyOtp: (otp: string) => Promise<RecoverySigner | undefined>;
}

export const CrossmintRecoveryKeyContext = React.createContext<CrossmintRecoveryKeyContextState | null>(null);

export function useCrossmintRecoveryKey() {
    const context = useContext(CrossmintRecoveryKeyContext);
    if (context == null) {
        throw new Error("useCrossmintRecoveryKey must be used within a CrossmintRecoveryKeyProvider");
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

const DEFAULT_SECURE_ENDPOINT_URL = "https://crossmint-signer-frames.onrender.com";

export function CrossmintRecoveryKeyProvider({
    children,
    experimental_secureEndpointUrl = DEFAULT_SECURE_ENDPOINT_URL,
}: CrossmintRecoveryKeyProviderProps) {
    const {
        crossmint: { apiKey, jwt, appId },
    } = useCrossmint();
    const { getOrCreateWallet } = useContext(BaseWalletContext);

    const webviewRef = useRef<WebView>(null);
    const webViewParentRef = useRef<WebViewParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null>(
        null
    );
    const [isWebViewReady, setIsWebViewReady] = useState(false);
    const [email, setEmail] = useState<string | null>(null);
    const [experimental_needsAuth, setNeedsAuth] = useState(false);
    const needsAuthRef = useRef(experimental_needsAuth);

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

    useEffect(() => {
        if (jwt == null) {
            setNeedsAuth(false);
            setEmail(null);
        } else if (isWebViewReady) {
            checkSignerExists();
        }
    }, [jwt, isWebViewReady]);

    useEffect(() => {
        needsAuthRef.current = experimental_needsAuth;
    }, [experimental_needsAuth]);

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
                        if (experimental_needsAuth) {
                            throw new Error(
                                "Authentication required. Please complete the OTP verification process before signing."
                            );
                        }

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
                            if (response == null || response.status === "error" || response.signature == null) {
                                console.error("Failed signMessage response:", response);
                                throw new Error("Failed to sign message");
                            }
                            return bs58.decode(response.signature);
                        } catch (err) {
                            console.error("Error during signMessage:", err);
                            throw err;
                        }
                    },
                    signTransaction: async (transaction: VersionedTransaction): Promise<VersionedTransaction> => {
                        if (needsAuthRef.current) {
                            throw new Error(
                                "Authentication required. Please complete the OTP verification process before signing."
                            );
                        }

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
                            if (response == null || response.status === "error" || response.signature == null) {
                                throw new Error("Failed to sign transaction: No signature returned");
                            }
                            transaction.addSignature(new PublicKey(address), bs58.decode(response.signature));
                            return transaction;
                        } catch (err) {
                            console.error("Error during signTransaction:", err);
                            throw err;
                        }
                    },
                },
            };
        },
        [jwt, apiKey, experimental_needsAuth]
    );

    const checkSignerExists = useCallback(async () => {
        const parent = webViewParentRef.current;
        if (parent == null || !isWebViewReady || jwt == null || apiKey == null) {
            console.warn("[checkSignerExists] Prerequisites not met (WebView, JWT, API Key). Status:", {
                isWebViewReady,
                hasJwt: jwt != null,
                hasApiKey: apiKey != null,
            });
            setNeedsAuth(false);
            return;
        }

        try {
            const signerResponse = await parent.sendAction({
                event: "request:get-public-key",
                responseEvent: "response:get-public-key",
                data: {
                    authData: { jwt, apiKey },
                    data: { chainLayer: "solana" },
                },
                options: { timeoutMs: 5000 },
            });

            if (signerResponse?.status === "success" && signerResponse.publicKey) {
                const existingSigner = buildRecoverySigner(signerResponse.publicKey);
                setNeedsAuth(false);
                await getOrCreateWallet({ type: "solana-smart-wallet", args: { adminSigner: existingSigner } });
            } else {
                setNeedsAuth(true);
            }
        } catch (error) {
            console.error("[checkSignerExists] Error checking for signer:", error);
            setNeedsAuth(true);
        }
    }, [isWebViewReady, jwt, apiKey, buildRecoverySigner, getOrCreateWallet]);

    const onWebViewLoad = useCallback(async () => {
        const parent = webViewParentRef.current;
        if (parent != null) {
            try {
                await parent.handshakeWithChild();
                setIsWebViewReady(true);
            } catch (e) {
                console.error("[RN] handshakeWithChild error:", e);
                setIsWebViewReady(false);
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

    const experimental_createRecoveryKeySigner = useCallback(
        async (emailInput: string): Promise<RecoverySigner | null> => {
            if (!isWebViewReady || jwt == null || apiKey == null) {
                console.warn(
                    "[createRecoveryKeySigner] Prerequisites not met (WebView ready, JWT, API Key). Cannot proceed."
                );
                setNeedsAuth(false);
                return null;
            }

            setEmail(emailInput);

            const parent = webViewParentRef.current;
            if (parent == null) {
                console.error("[createRecoveryKeySigner] WebView parent disappeared unexpectedly.");
                setNeedsAuth(false);
                return null;
            }

            try {
                const baseUrl = validateApiKeyAndGetCrossmintBaseUrl(apiKey);
                const response = await fetch(`${baseUrl}/api/unstable/wallets/ncs/irrelevant/public-key`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${jwt}`,
                        "x-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        authId: `email:${emailInput}`,
                        signingAlgorithm: "EDDSA_ED25519",
                    }),
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Failed to fetch public key: ${response.status} ${errorBody}`);
                }

                const responseData = await response.json();
                if (!responseData.publicKey) {
                    throw new Error("Fetched data does not contain a public key.");
                }

                const base64PublicKey = responseData.publicKey;
                const binaryData = Uint8Array.from(atob(base64PublicKey), (c) => c.charCodeAt(0));
                const adminSignerAddress = bs58.encode(binaryData);

                const fetchedSigner = buildRecoverySigner(adminSignerAddress);

                await getOrCreateWallet({ type: "solana-smart-wallet", args: { adminSigner: fetchedSigner } });
                setNeedsAuth(true);
                return null;
            } catch (error) {
                console.error("[createRecoveryKeySigner] Error during public key fetch or processing:", error);
                setNeedsAuth(true);
                return null;
            }
        },
        [isWebViewReady, jwt, apiKey, buildRecoverySigner, getOrCreateWallet]
    );

    const experimental_sendEmailWithOtp = useCallback(async (): Promise<void> => {
        const parent = webViewParentRef.current;
        if (parent == null || !isWebViewReady) {
            throw new Error("[sendEmailWithOtp] WebViewParent not ready or handshake incomplete.");
        }
        if (jwt == null || apiKey == null) {
            throw new Error("[sendEmailWithOtp] Missing authentication credentials (JWT or API Key).");
        }
        if (!experimental_needsAuth) {
            throw new Error("OTP email request is not applicable in the current state.");
        }

        const authId = `email:${email}`;

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
                setNeedsAuth(false);
                return;
            }

            if (response?.status === "error") {
                console.error("[sendEmailWithOtp] Failed to send OTP:", response);
                throw new Error(response.error || "Failed to initiate OTP process.");
            }

            console.log("[sendEmailWithOtp] OTP process likely initiated. Waiting for verification.");
        } catch (err) {
            console.error("[sendEmailWithOtp] Error sending create-signer request:", err);
            throw err;
        }
    }, [isWebViewReady, jwt, apiKey, email, experimental_needsAuth, buildRecoverySigner, getOrCreateWallet]);

    const experimental_verifyOtp = useCallback(
        async (encryptedOtp: string): Promise<RecoverySigner | undefined> => {
            const parent = webViewParentRef.current;
            if (parent == null || !isWebViewReady) {
                throw new Error("[verifyOtp] WebViewParent not ready or handshake incomplete.");
            }
            if (jwt == null || apiKey == null) {
                throw new Error("[verifyOtp] Missing authentication credentials (JWT or API Key).");
            }
            if (!experimental_needsAuth) {
                throw new Error("Not currently awaiting OTP validation.");
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

                if (response?.status === "success" && response.address) {
                    console.log("[verifyOtp] OTP validation successful. Signer address:", response.address);
                    setNeedsAuth(false);
                    return;
                } else {
                    console.error("[verifyOtp] Failed to validate OTP:", response);
                    setNeedsAuth(true);
                    const errorMessage =
                        response && response.status === "error" ? response.error : "Failed to validate encrypted OTP";
                    throw new Error(errorMessage);
                }
            } catch (err) {
                console.error("[verifyOtp] Error sending OTP validation request:", err);
                setNeedsAuth(true);
                throw err;
            }
        },
        [isWebViewReady, jwt, apiKey, experimental_needsAuth]
    );

    const contextValue = useMemo(
        () => ({
            experimental_needsAuth,
            experimental_createRecoveryKeySigner,
            experimental_sendEmailWithOtp,
            experimental_verifyOtp,
        }),
        [
            experimental_needsAuth,
            experimental_createRecoveryKeySigner,
            experimental_sendEmailWithOtp,
            experimental_verifyOtp,
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
                    onError={(syntheticEvent) => {
                        console.error("WebView onError:", syntheticEvent.nativeEvent);
                        setIsWebViewReady(false);
                        setNeedsAuth(false);
                    }}
                    onHttpError={(syntheticEvent) => {
                        console.error("WebView onHttpError:", syntheticEvent.nativeEvent);
                        setIsWebViewReady(false);
                        setNeedsAuth(false);
                    }}
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
