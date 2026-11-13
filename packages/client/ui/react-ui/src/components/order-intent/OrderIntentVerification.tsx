import { AgenticVerification, type AgenticVerificationInstance } from "@basis-theory/web-agentic";
import type {
    OrderIntentAgenticTokenRail,
    OrderIntentWithVerification,
    VerificationAppearance,
} from "@crossmint/client-sdk-base";
import { useContext, useEffect, useRef } from "react";

import { LoggerContext } from "../../providers/CrossmintProvider";
import { mapVerificationAppearanceToAgenticAppearance } from "../../utils/mapVerificationAppearanceToAgenticAppearance";
import { describeVerificationError } from "./verificationErrorLog";

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
    // Optional: this component can be mounted without a CrossmintProvider.
    const logger = useContext(LoggerContext);
    const loggerRef = useRef(logger);
    const { orderIntentId } = orderIntent;
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
        loggerRef.current = logger;
    }, [logger]);

    useEffect(() => {
        const logContext = { orderIntentId, allowanceId, provider: pendingProvider };
        if (pendingProvider == null) {
            loggerRef.current?.error("react.orderIntentVerification.failed", {
                ...logContext,
                "error.type": "no_pending_rail",
            });
            errorRef.current?.(new Error("Order intent does not have a rail pending verification"));
            return;
        }

        let cancelled = false;
        let settled = false;
        let lastAction: string | undefined;
        let verification: AgenticVerificationInstance | undefined;

        function onEvent(event: Record<string, unknown>) {
            if (event.type === "state_change" && typeof event.action === "string") {
                lastAction = event.action;
            } else if (event.type === "ceremony_open") {
                loggerRef.current?.info("react.orderIntentVerification.ceremonyOpen", {
                    ...logContext,
                    network: event.network,
                });
            }
        }

        async function verifyAllowance() {
            try {
                verification = AgenticVerification({
                    apiKey: publicApiKey,
                    apiBaseUrl: AGENTIC_API_URLS[environment],
                    displayName,
                    onEvent,
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
                loggerRef.current?.info("react.orderIntentVerification.start", logContext);
                await verification.verifyAllowance(allowanceId, {
                    provider: pendingProvider,
                });
                settled = true;
                if (!cancelled) {
                    loggerRef.current?.info("react.orderIntentVerification.success", logContext);
                    completeRef.current?.();
                }
            } catch (error) {
                settled = true;
                if (!cancelled) {
                    const { level, context } = describeVerificationError(error);
                    loggerRef.current?.[level]("react.orderIntentVerification.failed", {
                        ...logContext,
                        ...context,
                        lastAction,
                    });
                    errorRef.current?.(error);
                }
            }
        }

        void verifyAllowance();

        return () => {
            cancelled = true;
            if (!settled) {
                loggerRef.current?.info("react.orderIntentVerification.abandoned", { ...logContext, lastAction });
            }
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
        orderIntentId,
        pendingProvider,
        primaryColor,
        publicApiKey,
        secondaryColor,
        successColor,
    ]);

    return null;
}
