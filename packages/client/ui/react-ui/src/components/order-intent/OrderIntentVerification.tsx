import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory/react-agentic";
import type { OrderIntentWithVerification, VerificationAppearance } from "@crossmint/client-sdk-base";
import { useMemo, useEffect, useRef } from "react";

import { mapVerificationAppearanceToBtTheme } from "../../utils/mapVerificationAppearanceToBtTheme";

export interface OrderIntentVerificationProps {
    orderIntent: OrderIntentWithVerification;
    appearance?: VerificationAppearance;
    onVerificationComplete?: () => void;
    onVerificationError?: (error: unknown) => void;
}

export function OrderIntentVerification(props: OrderIntentVerificationProps) {
    const verificationConfig = props.orderIntent.verificationConfig;
    const btTheme = useMemo(() => mapVerificationAppearanceToBtTheme(props.appearance), [props.appearance]);
    return (
        <BasisTheoryAIProvider
            apiKey={verificationConfig.publicApiKey}
            environment={verificationConfig.environment}
            theme={btTheme}
        >
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

    const agentId = orderIntent.verificationConfig.agentId;
    const instructionId = orderIntent.verificationConfig.instructionId;

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
