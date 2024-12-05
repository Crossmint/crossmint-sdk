import { useEffect } from "react";
import type { CrossmintEmbeddedCheckoutV3Props, EmbeddedCheckoutV3IFrameEmitter } from "@crossmint/client-sdk-base";

export function SignerConnectionHandler({
    props,
    iframeClient,
}: { props: CrossmintEmbeddedCheckoutV3Props; iframeClient: EmbeddedCheckoutV3IFrameEmitter | null }) {
    useEffect(() => {
        if (iframeClient == null) {
            return;
        }

        const signTransactionListener = iframeClient.on(
            "crypto:send-transaction",
            async ({ serializedTransaction }) => {
                try {
                    const tx = await props.payment.crypto.signer!.handleSignAndSendTransaction(serializedTransaction);
                    const txId = tx.success ? tx.txId : "";

                    iframeClient.send("crypto:send-transaction:success", { txId });
                } catch (error) {
                    console.error("[SignerConnectionHandler] Failed to send transaction", error);
                    iframeClient.send("crypto:send-transaction:failed", {
                        error: (error as Error).message || "An unknown error occurred",
                    });
                }
            }
        );

        return () => {
            iframeClient.off(signTransactionListener);
        };
    }, [iframeClient]);

    return null;
}
