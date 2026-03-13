import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory-ai/react";
import type { VerificationConfig } from "@crossmint/client-sdk-base";
import { useEffect, useRef } from "react";

export interface PaymentMethodAgenticEnrollmentVerificationProps {
    config: VerificationConfig;
    agentEnrollmentId: string;
    onVerificationComplete?: (enrollment: unknown) => void;
    onVerificationError?: (error: Error) => void;
}

export function PaymentMethodAgenticEnrollmentVerification(props: PaymentMethodAgenticEnrollmentVerificationProps) {
    return (
        <BasisTheoryAIProvider apiKey={props.config.btApiKey} environment={props.config.environment}>
            <PaymentMethodAgenticEnrollmentVerificationContent {...props} />
        </BasisTheoryAIProvider>
    );
}

function PaymentMethodAgenticEnrollmentVerificationContent({
    agentEnrollmentId,
    onVerificationComplete,
    onVerificationError,
}: PaymentMethodAgenticEnrollmentVerificationProps) {
    const { verifyEnrollment } = useBasisTheoryAI();
    const verifyRef = useRef(verifyEnrollment);
    const completeRef = useRef(onVerificationComplete);
    const errorRef = useRef(onVerificationError);

    useEffect(() => {
        verifyRef.current = verifyEnrollment;
    }, [verifyEnrollment]);
    useEffect(() => {
        completeRef.current = onVerificationComplete;
    }, [onVerificationComplete]);
    useEffect(() => {
        errorRef.current = onVerificationError;
    }, [onVerificationError]);

    useEffect(() => {
        let cancelled = false;

        verifyRef
            .current(agentEnrollmentId)
            .then((enrollment: unknown) => {
                if (!cancelled) {
                    completeRef.current?.(enrollment);
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
    }, [agentEnrollmentId]);

    return null;
}
