import {
    useBtAi as useBasisTheoryAI,
    BtAiProvider as BasisTheoryAIProvider,
} from "@basis-theory-ai/react";
import type {
    OrderIntent,
    VerificationConfig,
} from "@crossmint/client-sdk-base";
import { useEffect, useCallback } from "react";

export interface OrderIntentVerificationProps {
    config: VerificationConfig;
    orderIntent: OrderIntent;
    onVerificationComplete?: (paymentIntent: unknown) => void;
    onVerificationError?: (error: Error) => void;
}

export function OrderIntentVerification(props: OrderIntentVerificationProps) {
    return (
        <BasisTheoryAIProvider
            jwt={props.config.btJwt}
            environment={props.config.environment}
        >
            <OrderIntentVerificationContent {...props} />
        </BasisTheoryAIProvider>
    );
}

function OrderIntentVerificationContent({
    config,
    orderIntent,
    onVerificationComplete,
    onVerificationError,
}: OrderIntentVerificationProps) {
    const { verifyPurchaseIntent } = useBasisTheoryAI();

    const handleVerification = useCallback(async () => {
        try {
            const paymentIntent = await verifyPurchaseIntent(
                config.btProjectId,
                orderIntent.payment.externalOrderIntentId
            );
            onVerificationComplete?.(paymentIntent);
        } catch (error) {
            onVerificationError?.(error as Error);
        }
    }, [
        verifyPurchaseIntent,
        config.btProjectId,
        orderIntent.orderIntentId,
        onVerificationComplete,
        onVerificationError,
    ]);

    useEffect(() => {
        handleVerification();
    }, [handleVerification]);

    return null;
}
