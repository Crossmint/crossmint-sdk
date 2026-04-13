import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory/react-agentic";
import type { OrderIntentWithVerification } from "@crossmint/client-sdk-base";
import { useEffect, useRef } from "react";

export interface OrderIntentVerificationProps {
    orderIntent: OrderIntentWithVerification;
    onVerificationComplete?: () => void;
    onVerificationError?: (error: unknown) => void;
}

export function OrderIntentVerification(props: OrderIntentVerificationProps) {
    const verificationConfig = props.orderIntent.verificationConfig;
    return (
        <BasisTheoryAIProvider apiKey={verificationConfig.publicApiKey} environment={verificationConfig.environment}>
            <OrderIntentVerificationContent {...props} />
        </BasisTheoryAIProvider>
    );
}

function OrderIntentVerificationContent({
    orderIntent,
    onVerificationComplete,
    onVerificationError,
}: OrderIntentVerificationProps) {
    const { verifyInstruction, ready } = useBasisTheoryAI();
    const verifyRef = useRef(verifyInstruction);
    const completeRef = useRef(onVerificationComplete);
    const errorRef = useRef(onVerificationError);

    useEffect(() => {
        verifyRef.current = verifyInstruction;
    }, [verifyInstruction]);
    useEffect(() => {
        completeRef.current = onVerificationComplete;
    }, [onVerificationComplete]);
    useEffect(() => {
        errorRef.current = onVerificationError;
    }, [onVerificationError]);

    const agentId = orderIntent.payment.paymentMethodId;
    const instructionId = orderIntent.payment.paymentMethodId;

    useEffect(() => {
        if (!ready) {
            return;
        }

        let cancelled = false;

        verifyRef
            .current(agentId, instructionId)
            .then(() => {
                if (!cancelled) {
                    completeRef.current?.();
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    errorRef.current?.(error);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [ready, agentId, instructionId]);

    return null;
}
