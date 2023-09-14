import {
    CryptoEmbeddedCheckoutPropsWithSigner,
    IncomingInternalEvent,
    crossmintIFrameService,
} from "@crossmint/client-sdk-base";

import CrossmintEmbeddedCheckoutIFrame from "../EmbeddedCheckoutIFrame";

export default function CryptoEmbeddedCheckoutIFrame(props: CryptoEmbeddedCheckoutPropsWithSigner) {
    const { emitInternalEvent } = crossmintIFrameService(props);

    const { signer } = props;

    function onInternalEvent(event: IncomingInternalEvent) {
        const { type, payload } = event;

        if (type === "crypto-payment:incoming-transaction") {
            const { serializedTransaction } = payload;
            handleIncomingTransaction(serializedTransaction);
        }
    }

    async function handleIncomingTransaction(serializedTransaction: string) {
        try {
            const txId = await signer.signAndSendTransaction(serializedTransaction);

            console.log("[Crossmint] Signed and sent transaction", txId);
            emitInternalEvent({
                type: "crypto-payment:user-accepted",
                payload: {
                    txId,
                },
            });
        } catch (e) {
            console.error("[Crossmint] Failed to sign and send transaction", e);
            emitInternalEvent({
                type: "crypto-payment:user-rejected",
                payload: {},
            });
        }
    }

    return <CrossmintEmbeddedCheckoutIFrame onInternalEvent={onInternalEvent} {...props} />;
}
