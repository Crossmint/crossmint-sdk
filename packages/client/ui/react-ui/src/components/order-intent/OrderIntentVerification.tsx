import { AgenticVerification, type AgenticVerificationInstance } from "@basis-theory/web-agentic";
import type {
    OrderIntentAgenticTokenRail,
    OrderIntentWithVerification,
    VerificationAppearance,
} from "@crossmint/client-sdk-base";
import { useEffect, useRef } from "react";

import { mapVerificationAppearanceToAgenticAppearance } from "../../utils/mapVerificationAppearanceToAgenticAppearance";

const AGENTIC_API_URLS = {
    production: "https://api.basistheory.com/agentic",
    test: "https://api.test.basistheory.com/agentic",
} as const;

export interface OrderIntentVerificationProps {
    /** The order intent returned by the API, including its `verificationConfig`. */
    orderIntent: OrderIntentWithVerification;
    /** Name of the agent shown to the user in the card network's verification UI. */
    displayName?: string;
    appearance?: VerificationAppearance;
    /** Called once the user has approved the allowance. Refetch the order intent afterwards. */
    onVerificationComplete?: () => void;
    onVerificationError?: (error: unknown) => void;
}

/**
 * Runs the card network's allowance verification for an order intent. Render it when the
 * intent's `agentic-token` rail reports `status: "pending_verification"`; it renders nothing
 * itself and opens the network's verification UI on mount.
 */
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
        (rail): rail is OrderIntentAgenticTokenRail =>
            rail.rail === "agentic-token" && rail.status === "pending_verification"
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
