import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory/react-agentic";
import type { OrderIntent, VerificationConfig } from "@crossmint/client-sdk-base";
import { useEffect, useRef } from "react";

export interface OrderIntentVerificationProps {
    config: VerificationConfig;
    orderIntent: OrderIntent;
    onVerificationComplete?: (instruction: unknown) => void;
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

    const agentId = orderIntent.payment.btAgentId;
    const instructionId = orderIntent.payment.btInstructionId;

    useEffect(() => {
        if (!ready) {
            return;
        }

        let cancelled = false;

        verifyRef
            .current(agentId, instructionId)
            .then((instruction: unknown) => {
                if (!cancelled) {
                    completeRef.current?.(instruction);
                }
            })
            .catch((error: Error) => {
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
