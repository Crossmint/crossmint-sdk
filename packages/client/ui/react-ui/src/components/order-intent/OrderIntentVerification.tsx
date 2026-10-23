import {
    AgenticVerification,
    type AgenticVerificationInstance,
    ApiError,
    CeremonyTimeoutError,
    ConfigurationError,
    PopupBlockedError,
    PopupClosedError,
    VerificationCancelledError,
    VerificationNotSupportedError,
} from "@basis-theory/web-agentic";
import type {
    OrderIntentAgenticTokenRail,
    OrderIntentWithVerification,
    VerificationAppearance,
} from "@crossmint/client-sdk-base";
import { useContext, useEffect, useRef } from "react";

import { mapVerificationAppearanceToAgenticAppearance } from "../../utils/mapVerificationAppearanceToAgenticAppearance";
import { LoggerContext } from "../../providers/CrossmintProvider";

const AGENTIC_API_URLS = {
    production: "https://api.basistheory.com/agentic",
    test: "https://api.test.basistheory.com/agentic",
} as const;

type VerificationErrorContext = {
    errorType:
        | "api"
        | "not_supported"
        | "popup_blocked"
        | "popup_closed"
        | "ceremony_timeout"
        | "configuration"
        | "unknown";
    httpStatus?: number;
    code?: string;
    btTraceId?: string;
};

function verificationErrorContext(error: unknown): VerificationErrorContext {
    const apiError = error instanceof VerificationNotSupportedError ? error.apiError : error;
    if (apiError instanceof ApiError) {
        // Free text, field errors and provider debug objects can contain protected inputs or tokens.
        return {
            errorType: error instanceof VerificationNotSupportedError ? "not_supported" : "api",
            httpStatus: apiError.status,
            code:
                typeof apiError.type === "string" &&
                /^[A-Z][A-Z0-9_]{0,95}$/.test(apiError.type) &&
                !/\d{12}/.test(apiError.type)
                    ? apiError.type
                    : undefined,
            btTraceId:
                typeof apiError.traceId === "string" &&
                /^[a-zA-Z0-9_-]{1,128}$/.test(apiError.traceId) &&
                !/\d{12}/.test(apiError.traceId)
                    ? apiError.traceId
                    : undefined,
        };
    }
    return {
        errorType:
            error instanceof PopupBlockedError
                ? "popup_blocked"
                : error instanceof PopupClosedError
                  ? "popup_closed"
                  : error instanceof CeremonyTimeoutError
                    ? "ceremony_timeout"
                    : error instanceof ConfigurationError
                      ? "configuration"
                      : error instanceof VerificationNotSupportedError
                        ? "not_supported"
                        : "unknown",
    };
}

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
    const logger = useContext(LoggerContext);
    const loggerRef = useRef(logger);
    loggerRef.current = logger;
    const completeRef = useRef(onVerificationComplete);
    const errorRef = useRef(onVerificationError);
    const agenticAppearance = mapVerificationAppearanceToAgenticAppearance(appearance);
    const pendingProvider = orderIntent.rails.find(
        (rail): rail is OrderIntentAgenticTokenRail =>
            rail.rail === "agentic-token" && rail.status === "pending_verification"
    )?.provider;
    const { allowanceId, environment, publicApiKey } = orderIntent.verificationConfig;
    const { orderIntentId } = orderIntent;
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
        const reported = new Set<unknown>();

        function recordFailure(error: unknown, source: "event" | "exception") {
            if (cancelled || error instanceof VerificationCancelledError || reported.has(error)) {
                return;
            }
            reported.add(error);
            try {
                loggerRef.current?.warn("Order intent verification failed", {
                    event: "order_intent.verification_failed",
                    orderIntentId,
                    allowanceId,
                    provider: pendingProvider,
                    source,
                    ...verificationErrorContext(error),
                });
            } catch {
                // Diagnostic delivery must not interrupt verification or replace the provider's error.
            }
        }

        async function verifyAllowance() {
            try {
                verification = AgenticVerification({
                    apiKey: publicApiKey,
                    apiBaseUrl: AGENTIC_API_URLS[environment],
                    displayName,
                    onEvent: (event) => {
                        if (event.type === "error") {
                            recordFailure(event.error, "event");
                        }
                    },
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
                    recordFailure(error, "exception");
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
        orderIntentId,
        pendingProvider,
        primaryColor,
        publicApiKey,
        secondaryColor,
        successColor,
    ]);

    return null;
}
