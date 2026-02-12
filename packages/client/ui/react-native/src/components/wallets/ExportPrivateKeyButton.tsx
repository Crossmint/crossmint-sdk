import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { useWallet, useCrossmint } from "@crossmint/client-sdk-react-base";
import { environmentUrlConfig, exportSignerInboundEvents, exportSignerOutboundEvents } from "@crossmint/client-signers";
import { isExportableSigner } from "@crossmint/wallets-sdk";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { WebViewParent, RNWebView } from "@crossmint/client-sdk-rn-window";

export interface ExportPrivateKeyButtonProps {
    /** Optional appearance configuration for styling the export button. */
    appearance?: UIConfig;
}

/**
 * Renders a button that allows the user to export their wallet's private key.
 * Only works with email and phone signers. Will not render for passkey or external wallet signers.
 */
export function ExportPrivateKeyButton({ appearance }: ExportPrivateKeyButtonProps) {
    const { wallet } = useWallet();
    const { crossmint } = useCrossmint();
    const webViewRef = useRef<WebView>(null);
    const connectionRef = useRef<WebViewParent<
        typeof exportSignerOutboundEvents,
        typeof exportSignerInboundEvents
    > | null>(null);
    const [frameUrl, setFrameUrl] = useState<string>("");

    useEffect(() => {
        if (crossmint != null) {
            try {
                const parsedAPIKey = validateAPIKey(crossmint.apiKey);
                if (parsedAPIKey.isValid) {
                    const baseUrl = environmentUrlConfig[parsedAPIKey.environment];
                    setFrameUrl(`${baseUrl}/export`);
                }
            } catch (error) {
                console.error("Failed to get TEE URL:", error);
            }
        }
    }, [crossmint]);

    const handleWebViewLoadEnd = useCallback(
        async (syntheticEvent: { nativeEvent: { loading: boolean } }) => {
            if (wallet == null || webViewRef.current == null || syntheticEvent.nativeEvent.loading) {
                return;
            }

            try {
                if (isExportableSigner(wallet.signer)) {
                    const connection = new WebViewParent(webViewRef, {
                        incomingEvents: exportSignerOutboundEvents,
                        outgoingEvents: exportSignerInboundEvents,
                    });
                    connectionRef.current = connection;
                    await connection.handshakeWithChild();
                    await wallet.signer._exportPrivateKey(connection);
                }
            } catch (error) {
                console.error("Failed to export private key:", error);
                Alert.alert("Export Failed", "Failed to export private key. Please try again.");
            }
        },
        [wallet]
    );

    const handleWebViewError = useCallback((syntheticEvent: { nativeEvent: unknown }) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView error:", nativeEvent);
        Alert.alert("Export Failed", "Failed to load export interface. Please try again.");
    }, []);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
        if (connectionRef.current) {
            connectionRef.current.handleMessage(event);
        }
    }, []);

    if (frameUrl === "" || wallet == null || !isExportableSigner(wallet.signer)) {
        return null;
    }

    return (
        <View style={styles.webViewContainer}>
            <RNWebView
                ref={webViewRef}
                source={{ uri: frameUrl }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onLoadEnd={handleWebViewLoadEnd}
                onError={handleWebViewError}
                onHttpError={handleWebViewError}
                onMessage={handleMessage}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    webViewContainer: {
        height: 56,
        borderWidth: 1,
        borderColor: "#E5E5E5",
        borderRadius: 12,
        overflow: "hidden",
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
    },
    loadingText: {
        fontSize: 16,
        color: "#666666",
    },
});
