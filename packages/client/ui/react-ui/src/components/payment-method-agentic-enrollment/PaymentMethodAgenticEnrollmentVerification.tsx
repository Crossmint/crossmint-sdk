import { useBtAi as useBasisTheoryAI, BtAiProvider as BasisTheoryAIProvider } from "@basis-theory/react-agentic";
import type {
    PaymentMethodAgenticEnrollmentWithVerificationConfig,
    VerificationAppearance,
} from "@crossmint/client-sdk-base";
import { useMemo, useEffect, useRef } from "react";

import { mapVerificationAppearanceToBtTheme } from "../../utils/mapVerificationAppearanceToBtTheme";

export interface PaymentMethodAgenticEnrollmentVerificationProps {
    paymentMethodAgenticEnrollment: PaymentMethodAgenticEnrollmentWithVerificationConfig;
    appearance?: VerificationAppearance;
    onVerificationComplete?: () => void;
    onVerificationError?: (error: unknown) => void;
}

export function PaymentMethodAgenticEnrollmentVerification(props: PaymentMethodAgenticEnrollmentVerificationProps) {
    const verificationConfig = props.paymentMethodAgenticEnrollment.verificationConfig;
    const btTheme = useMemo(() => mapVerificationAppearanceToBtTheme(props.appearance), [props.appearance]);
    return (
        <BasisTheoryAIProvider
            apiKey={verificationConfig.publicApiKey}
            environment={verificationConfig.environment}
            theme={btTheme}
        >
            <PaymentMethodAgenticEnrollmentVerificationContent {...props} />
        </BasisTheoryAIProvider>
    );
}

function PaymentMethodAgenticEnrollmentVerificationContent({
    paymentMethodAgenticEnrollment,
    onVerificationComplete,
    onVerificationError,
}: PaymentMethodAgenticEnrollmentVerificationProps) {
    const { verifyEnrollment, ready } = useBasisTheoryAI();
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
        if (!ready) {
            return;
        }

        let cancelled = false;

        verifyRef
            .current(paymentMethodAgenticEnrollment.enrollmentId)
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
    }, [ready, paymentMethodAgenticEnrollment.enrollmentId]);

    return null;
}
