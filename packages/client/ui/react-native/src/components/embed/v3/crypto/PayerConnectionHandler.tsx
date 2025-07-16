import { useEffect } from "react";
import type { EmbeddedCheckoutPayer } from "@crossmint/client-sdk-base";
import type { PayerSupportedBlockchains } from "@crossmint/common-sdk-base";
import type { WebViewParent } from "@crossmint/client-sdk-rn-window";
import type { embeddedCheckoutV3IncomingEvents, embeddedCheckoutV3OutgoingEvents } from "@crossmint/client-sdk-base";

export function PayerConnectionHandler({
    payer,
    webViewClient,
}: {
    payer: EmbeddedCheckoutPayer;
    webViewClient: WebViewParent<
        typeof embeddedCheckoutV3IncomingEvents,
        typeof embeddedCheckoutV3OutgoingEvents
    > | null;
}) {
    useEffect(() => {
        if (webViewClient == null) {
            return;
        }

        const signTransactionListener = webViewClient.on(
            "crypto:send-transaction",
            async ({ chain, serializedTransaction }) => {
                try {
                    await payer.handleChainSwitch(chain as PayerSupportedBlockchains);
                    const tx = await payer.handleSignAndSendTransaction(serializedTransaction);
                    if (tx.success) {
                        webViewClient.send("crypto:send-transaction:success", { txId: tx.txId });
                    } else {
                        webViewClient.send("crypto:send-transaction:failed", { error: tx.errorMessage });
                    }
                } catch (error) {
                    console.error("[PayerConnectionHandler] Failed to send transaction", error);
                    webViewClient.send("crypto:send-transaction:failed", {
                        error: (error as Error).message || "An unknown error occurred",
                    });
                }
            }
        );

        return () => {
            webViewClient.off(signTransactionListener);
        };
    }, [webViewClient]);

    return null;
}
