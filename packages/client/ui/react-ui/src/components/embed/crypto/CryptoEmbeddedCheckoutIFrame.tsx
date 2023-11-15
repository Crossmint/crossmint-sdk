import useDeepEffect from "@/hooks/useDeepEffect";
import bs58 from "bs58";

import {
    CryptoEmbeddedCheckoutPropsWithSigner,
    ETHEmbeddedCheckoutSigner,
    IncomingInternalEvent,
    IncomingInternalEvents,
    OutgoingInternalEvents,
    SOLEmbeddedCheckoutSigner,
    crossmintIFrameService,
    embeddedCheckoutPropsToUpdatableParamsPayload,
} from "@crossmint/client-sdk-base";

import CrossmintEmbeddedCheckoutIFrame from "../EmbeddedCheckoutIFrame";

export default function CryptoEmbeddedCheckoutIFrame(props: CryptoEmbeddedCheckoutPropsWithSigner) {
    const { emitInternalEvent } = crossmintIFrameService(props);

    const { signer, paymentMethod } = props;

    function onInternalEvent(event: IncomingInternalEvent) {
        const { type, payload } = event;

        if (type === IncomingInternalEvents.CRYPTO_PAYMENT_INCOMING_TRANSACTION) {
            const { serializedTransaction } = payload;
            console.log("[Crossmint] Received incoming transaction", serializedTransaction);
            handleIncomingTransaction(serializedTransaction);
        }
    }

    async function handleIncomingTransaction(serializedTransaction: string) {
        try {
            let txId: string;
            switch (paymentMethod) {
                case "SOL":
                    txId = await handleSOLTransaction(signer, serializedTransaction);
                    break;
                case "ETH":
                    txId = await handleETHTransaction(signer, serializedTransaction);
                    break;
                default:
                    throw new Error(`Unsupported payment method ${paymentMethod}`);
            }

            console.log("[Crossmint] Signed and sent transaction", txId);
            emitInternalEvent({
                type: OutgoingInternalEvents.CRYPTO_PAYMENT_USER_ACCEPTED,
                payload: {
                    txId,
                },
            });
        } catch (e) {
            console.error("[Crossmint] Failed to sign and send transaction", e);
            emitInternalEvent({
                type: OutgoingInternalEvents.CRYPTO_PAYMENT_USER_REJECTED,
                payload: {},
            });
        }
    }

    async function handleSOLTransaction(signer: SOLEmbeddedCheckoutSigner, serializedTransaction: string) {
        // @ts-ignore - Error becasue we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
        const { Transaction } = await import("@solana/web3.js");
        const transaction = Transaction.from(bs58.decode(serializedTransaction));
        console.log("[Crossmint] Deserialized SOL transaction", transaction);

        return await signer.signAndSendTransaction(transaction);
    }

    async function handleETHTransaction(signer: ETHEmbeddedCheckoutSigner, serializedTransaction: string) {
        // @ts-ignore - Error becasue we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
        const { parse: parseTransaction } = await import("@ethersproject/transactions");
        const transaction = parseTransaction(serializedTransaction);
        console.log("[Crossmint] Deserialized ETH transaction", transaction);

        return await signer.signAndSendTransaction(transaction);
    }

    useDeepEffect(() => {
        emitInternalEvent({
            type: "params-update",
            payload: embeddedCheckoutPropsToUpdatableParamsPayload(props),
        });
    }, [props.signer.address, props.recipient, props.mintConfig, props.locale, props.currency, props.whPassThroughArgs]);

    return <CrossmintEmbeddedCheckoutIFrame onInternalEvent={onInternalEvent} {...props} />;
}
