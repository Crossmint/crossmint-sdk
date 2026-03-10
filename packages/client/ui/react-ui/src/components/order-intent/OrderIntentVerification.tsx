import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory-ai/react";
import type { OrderIntent, VerificationConfig } from "@crossmint/client-sdk-base";
import { useEffect, useCallback } from "react";

export interface OrderIntentVerificationProps {
    config: VerificationConfig;
    orderIntent: OrderIntent;
    onVerificationComplete?: (paymentIntent: unknown) => void;
    onVerificationError?: (error: Error) => void;
}

export function OrderIntentVerification(props: OrderIntentVerificationProps) {
    return (
        <BasisTheoryAIProvider apiKey={props.config.btApiKey} environment={props.config.environment}>
            <OrderIntentVerificationContent {...props} />
        </BasisTheoryAIProvider>
    );
}

function OrderIntentVerificationContent({
    orderIntent,
    onVerificationComplete,
    onVerificationError,
}: OrderIntentVerificationProps) {
    const { verifyInstruction } = useBasisTheoryAI();

    const handleVerification = useCallback(async () => {
        try {
            const instruction = await verifyInstruction(
                orderIntent.payment.btAgentId,
                orderIntent.payment.btInstructionId
            );
            onVerificationComplete?.(instruction);
        } catch (error) {
            onVerificationError?.(error as Error);
        }
    }, [
        verifyInstruction,
        orderIntent.payment.btAgentId,
        orderIntent.payment.btInstructionId,
        onVerificationComplete,
        onVerificationError,
    ]);

    useEffect(() => {
        handleVerification();
    }, [handleVerification]);

    return null;
}
