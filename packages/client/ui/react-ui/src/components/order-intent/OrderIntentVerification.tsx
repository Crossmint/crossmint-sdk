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

// After an `openRedirect` launch, Basis Theory polls `complete` 6 × this many times, every 2 s, and
// stops at the allowance's expiry. Its default (10) gives the buyer 2 minutes, too short for an
// issuer approval plus a passkey; 25 gives 5 minutes, the same as the popup flow.
const OPEN_REDIRECT_COMPLETE_POLL_ATTEMPTS = 25;

export interface OrderIntentVerificationProps {
    /** The order intent returned by the API, including its `verificationConfig`. */
    orderIntent: OrderIntentWithVerification;
    /** Name of the agent shown to the user in the card network's verification UI. */
    displayName?: string;
    appearance?: VerificationAppearance;
    /** Called once the user has approved the allowance. Refetch the order intent afterwards. */
    onVerificationComplete?: () => void;
    onVerificationError?: (error: unknown) => void;
    /**
     * Opens the card network's hosted verification page (Mastercard) instead of `window.open`.
     * Set it when the component runs in a WebView: open `uri` in an in-app browser that shares
     * the system browser's storage and passkeys, such as `ASWebAuthenticationSession` on iOS or
     * Chrome Custom Tabs on Android. Completion is then confirmed by polling, so the page does
     * not need to report back. `onVerificationComplete` can fire while Mastercard still offers to
     * save a passkey, so do not close the browser from it; let the buyer finish and close it.
     */
    openRedirect?: (uri: string) => void;
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
    openRedirect,
}: OrderIntentVerificationProps) {
    const completeRef = useRef(onVerificationComplete);
    const errorRef = useRef(onVerificationError);
    // A ref, so a host that passes a new function on every render does not restart verification.
    const openRedirectRef = useRef(openRedirect);
    const hasOpenRedirect = openRedirect != null;
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
        openRedirectRef.current = openRedirect;
    }, [openRedirect]);

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
                    openRedirect: hasOpenRedirect ? (uri: string) => openRedirectRef.current?.(uri) : undefined,
                    completePollAttempts: hasOpenRedirect ? OPEN_REDIRECT_COMPLETE_POLL_ATTEMPTS : undefined,
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
        hasOpenRedirect,
        pendingProvider,
        primaryColor,
        publicApiKey,
        secondaryColor,
        successColor,
    ]);

    return null;
}
