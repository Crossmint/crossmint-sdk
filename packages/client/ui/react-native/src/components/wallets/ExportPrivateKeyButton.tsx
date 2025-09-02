import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { WebView, type WebViewNavigationEvent } from "react-native-webview";
import { useWallet, useCrossmint } from "@crossmint/client-sdk-react-base";
import { environmentUrlConfig } from "@crossmint/client-signers";
import { isExportableSigner } from "@crossmint/wallets-sdk";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import type { UIConfig } from "@crossmint/common-sdk-base";
// import { WebViewParent } from "@crossmint/client-sdk-rn-window";

interface ExportPrivateKeyButtonProps {
    onClick?: () => void;
    appearance?: UIConfig;
}

export function ExportPrivateKeyButton({ onClick }: ExportPrivateKeyButtonProps) {
    const { wallet } = useWallet();
    const { crossmint } = useCrossmint();
    const webViewRef = useRef<WebView>(null);
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
        async (event: WebViewNavigationEvent) => {
            if (wallet == null || webViewRef.current == null || event.nativeEvent.loading) {
                return;
            }

            try {
                // WebView has loaded, now trigger the export
                if (isExportableSigner(wallet.signer)) {
                    /*
                const connection = new WebViewParent(webViewRef, {
                    incomingEvents: exportSignerOutboundEvents,
                    outgoingEvents: exportSignerInboundEvents,
                });
                await connection.handshakeWithChild();
                await wallet.signer._exportPrivateKey(connection);
                */
                    const payload = await wallet.signer._exportPrivateKey();
                    const message = {
                        type: "request:export-signer",
                        ...payload,
                    };
                    const origin = frameUrl.split("/").slice(0, 3).join("/");
                    const script = `
                    window.CrossmintFrameReady.then(() => {
                        window.postMessage(${JSON.stringify(message)}, "${origin}");
                    }).catch(e => {
                        console.error("[Crossmint] Error waiting for CrossmintFrameReady:", e);
                    });
                    true;
                `;
                    webViewRef.current.injectJavaScript(script);
                    onClick?.();
                }
            } catch (error) {
                console.error("Failed to export private key:", error);
                Alert.alert("Export Failed", "Failed to export private key. Please try again.");
            }
        },
        [wallet, onClick, frameUrl]
    );

    const handleWebViewError = useCallback((syntheticEvent: { nativeEvent: unknown }) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView error:", nativeEvent);
        Alert.alert("Export Failed", "Failed to load export interface. Please try again.");
    }, []);

    if (frameUrl === "" || wallet == null || !isExportableSigner(wallet.signer)) {
        return null;
    }

    return (
        <View style={styles.webViewContainer}>
            <WebView
                ref={webViewRef}
                source={{ uri: frameUrl }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onLoadEnd={handleWebViewLoadEnd}
                onError={handleWebViewError}
                onHttpError={handleWebViewError}
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
