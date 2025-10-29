import { useEffect } from "react";
import type { EmbeddedCheckoutPayer, EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";
import type { PayerSupportedBlockchains } from "@crossmint/common-sdk-base";

export function PayerConnectionHandler({
    payer,
    iframeClient,
}: { payer: EmbeddedCheckoutPayer; iframeClient: EmbeddedCheckoutV3IFrameEmitter | null }) {
    useEffect(() => {
        if (iframeClient == null) {
            return;
        }

        const signTransactionListener = iframeClient.on(
            "crypto:send-transaction",
            async ({ chain, serializedTransaction }) => {
                try {
                    await payer.handleChainSwitch(chain as PayerSupportedBlockchains);
                    const tx = await payer.handleSignAndSendTransaction(serializedTransaction);
                    const txId = tx.success ? tx.txId : "";

                    if (tx.success) {
                        iframeClient.send("crypto:send-transaction:success", { txId });
                    } else {
                        iframeClient.send("crypto:send-transaction:failed", { error: tx.errorMessage });
                    }
                } catch (error) {
                    console.error("[SignerConnectionHandler] Failed to send transaction", error);
                    iframeClient.send("crypto:send-transaction:failed", {
                        error: (error as Error).message || "An unknown error occurred",
                    });
                }
            }
        );

        const signMessageListener = iframeClient.on("crypto:sign-message", async ({ message }) => {
            try {
                if (payer.handleSignMessage == null) {
                    throw new Error("handleSignMessage is not implemented on payer");
                }

                const signature = await payer.handleSignMessage(message);
                iframeClient.send("crypto:sign-message:success", { signature });
                return;
            } catch (error) {
                console.error("[PayerConnectionHandler] failed to sign message", error);
                iframeClient.send("crypto:sign-message:failed", { error: (error as Error).message });
            }
        });

        return () => {
            iframeClient.off(signTransactionListener);
            iframeClient.off(signMessageListener);
        };
    }, [iframeClient, payer]);

    return null;
}
