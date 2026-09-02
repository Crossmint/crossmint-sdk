import { AgenticVerification, type AgenticVerificationInstance } from "@basis-theory/web-agentic";
import type { OrderIntentWithVerification, VerificationAppearance } from "@crossmint/client-sdk-base";
import { useEffect, useMemo, useRef } from "react";

import { mapVerificationAppearanceToAgenticAppearance } from "../../utils/mapVerificationAppearanceToAgenticAppearance";

const AGENTIC_API_URLS = {
    production: "https://api.basistheory.com/agentic",
    test: "https://api.test.basistheory.com/agentic",
} as const;

export interface OrderIntentVerificationProps {
    orderIntent: OrderIntentWithVerification;
    displayName?: string;
    appearance?: VerificationAppearance;
    onVerificationComplete?: () => void;
    onVerificationError?: (error: unknown) => void;
}

export function OrderIntentVerification({
    orderIntent,
    displayName,
    appearance,
    onVerificationComplete,
    onVerificationError,
}: OrderIntentVerificationProps) {
    const completeRef = useRef(onVerificationComplete);
    const errorRef = useRef(onVerificationError);
    const agenticAppearance = useMemo(() => mapVerificationAppearanceToAgenticAppearance(appearance), [appearance]);
    const pendingRail = orderIntent.rails.find(
        (rail) => rail.rail === "agentic-token" && rail.status === "pending_verification"
    );

    useEffect(() => {
        completeRef.current = onVerificationComplete;
    }, [onVerificationComplete]);

    useEffect(() => {
        errorRef.current = onVerificationError;
    }, [onVerificationError]);

    const verificationConfig = orderIntent.verificationConfig;

    useEffect(() => {
        if (pendingRail == null) {
            errorRef.current?.(new Error("Order intent does not have a rail pending verification"));
            return;
        }

        const provider = pendingRail.provider;
        let cancelled = false;
        let verification: AgenticVerificationInstance | undefined;

        async function verifyAllowance() {
            try {
                verification = AgenticVerification({
                    apiKey: verificationConfig.publicApiKey,
                    apiBaseUrl: AGENTIC_API_URLS[verificationConfig.environment],
                    displayName,
                    appearance: agenticAppearance,
                });
                await verification.verifyAllowance(verificationConfig.allowanceId, {
                    provider,
                });
                if (!cancelled) {
                    completeRef.current?.();
                }
            } catch (error) {
                if (!cancelled) {
                    errorRef.current?.(error);
                }
            }
        }

        void verifyAllowance();

        return () => {
            cancelled = true;
            verification?.dispose();
        };
    }, [agenticAppearance, displayName, pendingRail, verificationConfig]);

    return null;
}
