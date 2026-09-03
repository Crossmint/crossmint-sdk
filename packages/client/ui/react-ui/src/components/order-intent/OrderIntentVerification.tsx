import { AgenticVerification, type AgenticVerificationInstance } from "@basis-theory/web-agentic";
import type { OrderIntentWithVerification, VerificationAppearance } from "@crossmint/client-sdk-base";
import { useEffect, useRef } from "react";

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
    const agenticAppearance = mapVerificationAppearanceToAgenticAppearance(appearance);
    const pendingProvider = orderIntent.rails.find(
        (rail) => rail.rail === "agentic-token" && rail.status === "pending_verification"
    )?.provider;
    const { allowanceId, environment, publicApiKey } = orderIntent.verificationConfig;
    const hasAgenticAppearance = agenticAppearance != null;
    const primaryColor = agenticAppearance?.primaryColor;
    const secondaryColor = agenticAppearance?.secondaryColor;
    const backgroundColor = agenticAppearance?.backgroundColor;
    const fontColor = agenticAppearance?.fontColor;
    const successColor = agenticAppearance?.successColor;
    const errorColor = agenticAppearance?.errorColor;

    useEffect(() => {
        completeRef.current = onVerificationComplete;
    }, [onVerificationComplete]);

    useEffect(() => {
        errorRef.current = onVerificationError;
    }, [onVerificationError]);

    useEffect(() => {
        if (pendingProvider == null) {
            errorRef.current?.(new Error("Order intent does not have a rail pending verification"));
            return;
        }

        let cancelled = false;
        let verification: AgenticVerificationInstance | undefined;

        async function verifyAllowance() {
            try {
                verification = AgenticVerification({
                    apiKey: publicApiKey,
                    apiBaseUrl: AGENTIC_API_URLS[environment],
                    displayName,
                    appearance: hasAgenticAppearance
                        ? {
                              primaryColor,
                              secondaryColor,
                              backgroundColor,
                              fontColor,
                              successColor,
                              errorColor,
                          }
                        : undefined,
                });
                await verification.verifyAllowance(allowanceId, {
                    provider: pendingProvider,
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
    }, [
        allowanceId,
        backgroundColor,
        displayName,
        environment,
        errorColor,
        fontColor,
        hasAgenticAppearance,
        pendingProvider,
        primaryColor,
        publicApiKey,
        secondaryColor,
        successColor,
    ]);

    return null;
}
