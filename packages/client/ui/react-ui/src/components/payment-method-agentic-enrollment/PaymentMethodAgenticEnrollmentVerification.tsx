import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory-ai/react";
import type { VerificationConfig } from "@crossmint/client-sdk-base";
import { useEffect, useCallback } from "react";

export interface PaymentMethodAgenticEnrollmentVerificationProps {
    config: VerificationConfig;
    agentEnrollmentId: string;
    onVerificationComplete?: (paymentIntent: unknown) => void;
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

    const handleVerification = useCallback(async () => {
        try {
            const enrollment = await verifyEnrollment(agentEnrollmentId);
            onVerificationComplete?.(enrollment);
        } catch (error) {
            onVerificationError?.(error as Error);
        }
    }, [verifyEnrollment, agentEnrollmentId, onVerificationComplete, onVerificationError]);

    useEffect(() => {
        handleVerification();
    }, [handleVerification]);

    return null;
}
