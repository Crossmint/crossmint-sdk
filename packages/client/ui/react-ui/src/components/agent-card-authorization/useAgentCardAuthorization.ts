import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type AgentCardAuthorizationErrorCode,
    type AgentCardPaymentMethodSummary,
    type AgentCardRail,
    type CrossmintAgentCardAuthorizationProps,
    type OrderIntent,
    type OrderIntentWithVerification,
    type OrderIntentsApi,
    OrderIntentsApiError,
    createOrderIntentsApi,
    findCardRail,
    needsOrderIntentRegistration,
    selectCardRail,
    toAgentCardPaymentMethodSummary,
    toAgentCardRail,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;
/** How long the Crossmint auth provider gets to load a session before `missing_jwt` is reported. */
export const MISSING_JWT_GRACE_MS = 3_000;
/** Pause between two re-reads of the order intent after a rail step. */
export const RAIL_POLL_INTERVAL_MS = 2_000;
/**
 * How long a rail gets to turn `active` after the buyer completed its step. Transient re-read
 * failures (network, 5xx) are retried inside this budget. An estimate until the providers'
 * activation latency is measured; documented in the PR.
 */
export const RAIL_POLL_TIMEOUT_MS = 60_000;

type PendingStep = {
    paymentMethod: AgentCardPaymentMethodSummary;
    orderIntent: OrderIntent;
    selection: AgentCardRail;
};

export type AgentCardAuthorizationStep =
    | { kind: "select" }
    | ({ kind: "verify"; orderIntent: OrderIntentWithVerification } & Omit<PendingStep, "orderIntent">)
    | ({ kind: "cvc" } & PendingStep)
    | { kind: "done" };

function errorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message !== "") {
        return error.message;
    }
    return fallback;
}

function isExpired(orderIntent: OrderIntent): boolean {
    if (orderIntent.status !== "active") {
        return true;
    }
    const expiresAt = Date.parse(orderIntent.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function useLatestProps(props: CrossmintAgentCardAuthorizationProps) {
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });
    return latestProps;
}

function useIsMounted() {
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    return mounted;
}

/**
 * The two terminal callbacks, with the exactly-once contract enforced here: `onAuthorized`
 * fires at most once per mount and nothing fires after it. `fail` returns the flow to card
 * selection and bumps the generation, which aborts any rail poll still running.
 */
function useTerminalCallbacks(
    latestProps: RefObject<CrossmintAgentCardAuthorizationProps>,
    setStep: (step: AgentCardAuthorizationStep) => void
) {
    const mounted = useIsMounted();
    const authorized = useRef(false);
    const generation = useRef(0);

    const fail = useCallback(
        (code: AgentCardAuthorizationErrorCode, message: string) => {
            if (!mounted.current || authorized.current) {
                return;
            }
            generation.current += 1;
            setStep({ kind: "select" });
            latestProps.current?.onError({ code, message });
        },
        [latestProps, mounted, setStep]
    );

    const succeed = useCallback(
        (paymentMethod: AgentCardPaymentMethodSummary, orderIntent: OrderIntent, selection: AgentCardRail) => {
            if (!mounted.current || authorized.current) {
                return;
            }
            authorized.current = true;
            setStep({ kind: "done" });
            latestProps.current?.onAuthorized({
                orderIntentId: orderIntent.orderIntentId,
                paymentMethod,
                rail: selection,
                amount: orderIntent.amount,
                expiresAt: orderIntent.expiresAt,
            });
        },
        [latestProps, mounted, setStep]
    );

    // Memoized so the callbacks built on it keep their identity across renders.
    return useMemo(() => ({ fail, succeed, mounted, generation }), [fail, succeed, mounted, generation]);
}

/**
 * Reports `missing_jwt` when no JWT shows up within the grace period, which covers an auth
 * provider that loads its session asynchronously. Re-arms once a JWT is present, so a later
 * logout is reported again.
 */
function useMissingJwtReport(jwt: string | undefined, fail: ReturnType<typeof useTerminalCallbacks>["fail"]) {
    const reported = useRef(false);
    useEffect(() => {
        if (jwt != null) {
            reported.current = false;
            return;
        }
        if (reported.current) {
            return;
        }
        const timer = setTimeout(() => {
            reported.current = true;
            fail("missing_jwt", "CrossmintAgentCardAuthorization needs a buyer JWT in the Crossmint context.");
        }, MISSING_JWT_GRACE_MS);
        return () => clearTimeout(timer);
    }, [jwt, fail]);
}

/**
 * The JWT frozen for the hosted UI of the current step. A token refresh while a step is open
 * keeps its JWT, so the iframe is not reloaded under the buyer. Each new step (a CVC form, or
 * the payment-method UI mounting again after an error) starts from the current JWT, so an
 * iframe never opens with a token that expired since an earlier refresh. A logout drops it.
 */
function useStepJwt(jwt: string | undefined, stepKind: AgentCardAuthorizationStep["kind"]) {
    const [frozen, setFrozen] = useState({ kind: stepKind, jwt });
    const reusable = frozen.kind === stepKind && frozen.jwt != null && jwt != null;
    useEffect(() => {
        if (!reusable) {
            setFrozen({ kind: stepKind, jwt });
        }
    }, [reusable, stepKind, jwt]);
    // Synchronous, so a new step renders with the current JWT on its first frame.
    return reusable ? frozen.jwt : jwt;
}

type OrderIntentRequestFields = Pick<CrossmintAgentCardAuthorizationProps, "amount" | "merchant" | "description"> & {
    expiresAt: string;
};

/**
 * Order intents created during this mount, keyed by card and by the request that created
 * them, so a re-selection re-reads instead of re-creating, and a change of amount, merchant,
 * description or expiry creates a new one.
 */
function useOrderIntentCache() {
    return useRef(new Map<string, string>());
}

function orderIntentCacheKey(paymentMethodId: string, request: OrderIntentRequestFields): string {
    return `${paymentMethodId}|${JSON.stringify(request)}`;
}

function forgetOrderIntent(cache: Map<string, string> | null, orderIntentId: string) {
    for (const [key, value] of cache?.entries() ?? []) {
        if (value === orderIntentId) {
            cache?.delete(key);
        }
    }
}

// A 4xx says the order intent cannot be read; anything else (network, 5xx) is worth another try.
function isTransientReadError(error: unknown): boolean {
    if (error instanceof OrderIntentsApiError) {
        return error.status == null || error.status >= 500;
    }
    return true;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRegistered(api: OrderIntentsApi, paymentMethodId: string) {
    const registration = await api.getRegistration(paymentMethodId);
    if (needsOrderIntentRegistration(registration)) {
        await api.register(paymentMethodId);
    }
}

type Terminal = ReturnType<typeof useTerminalCallbacks>;

/**
 * After the buyer completed a rail step, re-reads the order intent until that rail is active
 * or the time budget runs out; transient read failures are retried inside the budget. Only
 * one poll runs per generation; a duplicate completion event is ignored, and a `fail` in the
 * meantime (bumping the generation) aborts the poll before it can authorize, without blocking
 * the poll of the next attempt.
 */
function useRailPolling(api: OrderIntentsApi, terminal: Terminal, failExpired: (orderIntent: OrderIntent) => void) {
    const { fail, succeed, mounted, generation } = terminal;
    const pollingGeneration = useRef<number | null>(null);
    return useCallback(
        async ({ paymentMethod, orderIntent: { orderIntentId }, selection }: PendingStep) => {
            const startedAt = generation.current;
            if (pollingGeneration.current === startedAt) {
                return;
            }
            pollingGeneration.current = startedAt;
            const stillCurrent = () => mounted.current && generation.current === startedAt;
            const deadline = Date.now() + RAIL_POLL_TIMEOUT_MS;
            try {
                while (stillCurrent()) {
                    let orderIntent: OrderIntent | null = null;
                    try {
                        orderIntent = await api.getOrderIntent(orderIntentId);
                    } catch (error) {
                        if (!isTransientReadError(error)) {
                            fail("verification_failed", errorMessage(error, "Could not re-read the order intent."));
                            return;
                        }
                    }
                    if (!stillCurrent()) {
                        return;
                    }
                    if (orderIntent != null) {
                        if (isExpired(orderIntent)) {
                            failExpired(orderIntent);
                            return;
                        }
                        const rail = findCardRail(orderIntent.rails, selection);
                        if (rail == null || rail.status === "error") {
                            fail("verification_failed", "The verified rail is no longer usable.");
                            return;
                        }
                        if (rail.status === "active") {
                            succeed(paymentMethod, orderIntent, selection);
                            return;
                        }
                    }
                    const remaining = deadline - Date.now();
                    if (remaining <= 0) {
                        break;
                    }
                    await sleep(Math.min(RAIL_POLL_INTERVAL_MS, remaining));
                }
                if (stillCurrent()) {
                    fail(
                        "verification_failed",
                        `The rail did not become active within ${RAIL_POLL_TIMEOUT_MS / 1000}s after verification.`
                    );
                }
            } finally {
                if (pollingGeneration.current === startedAt) {
                    pollingGeneration.current = null;
                }
            }
        },
        [api, fail, failExpired, generation, mounted, succeed]
    );
}

/**
 * Decides what to do with an order intent: authorize, verify, refresh the CVC, or fail. A
 * terminal order intent is forgotten so the next selection of that card creates a new one.
 */
function useRailSettlement(
    api: OrderIntentsApi,
    terminal: Terminal,
    cache: RefObject<Map<string, string>>,
    setStep: (step: AgentCardAuthorizationStep) => void
) {
    const { fail, succeed } = terminal;

    const failExpired = useCallback(
        (orderIntent: OrderIntent) => {
            forgetOrderIntent(cache.current, orderIntent.orderIntentId);
            fail("expired", `Order intent ${orderIntent.orderIntentId} is ${orderIntent.status}.`);
        },
        [cache, fail]
    );

    // `registrationError` is the message of a registration step that failed earlier; the order
    // intent may still carry a usable rail, so it only surfaces when no rail is usable.
    const settle = useCallback(
        (paymentMethod: AgentCardPaymentMethodSummary, orderIntent: OrderIntent, registrationError: string | null) => {
            if (isExpired(orderIntent)) {
                failExpired(orderIntent);
                return;
            }
            const canVerify = orderIntent.verificationConfig != null;
            const rail = selectCardRail(orderIntent.rails, { canVerify });
            if (rail == null) {
                if (registrationError != null) {
                    fail(
                        "registration_failed",
                        `Could not register the card for order intents (${registrationError}), and the order intent has no usable card rail.`
                    );
                    return;
                }
                fail("rail_unavailable", "The order intent has no usable card rail.");
                return;
            }
            const selection = toAgentCardRail(rail);
            if (rail.status === "active") {
                succeed(paymentMethod, orderIntent, selection);
                return;
            }
            if (rail.status === "pending_verification") {
                // selectCardRail only returns a pending_verification rail when canVerify, so this
                // narrows the type rather than handling a reachable case.
                if (orderIntent.verificationConfig == null) {
                    fail("rail_unavailable", "The rail needs a verification this order intent cannot run.");
                    return;
                }
                setStep({ kind: "verify", paymentMethod, orderIntent, selection });
                return;
            }
            setStep({ kind: "cvc", paymentMethod, orderIntent, selection });
        },
        [fail, failExpired, setStep, succeed]
    );

    const awaitRailActive = useRailPolling(api, terminal, failExpired);

    return { settle, awaitRailActive };
}

/**
 * Registers the card when needed, then creates its order intent, or re-reads the one created
 * earlier in this mount, and hands it to `settle`. Registration is best effort: a card no
 * agentic-token provider accepts (the server answers the PUT with a 4xx) can still be served
 * by the `encrypted-card` rail, so a registration failure is carried along and reported only
 * if the order intent ends up with no usable rail. One authorization runs at a time.
 */
function useAuthorizeCard(
    api: OrderIntentsApi,
    terminal: Terminal,
    latestProps: RefObject<CrossmintAgentCardAuthorizationProps>,
    cache: RefObject<Map<string, string>>,
    settle: ReturnType<typeof useRailSettlement>["settle"]
) {
    const { fail, mounted } = terminal;
    // "24 hours from mount", fixed once so a re-render does not move the expiry.
    const defaultExpiresAt = useRef(new Date(Date.now() + DEFAULT_EXPIRY_MS).toISOString());
    const inFlight = useRef(false);

    const loadOrderIntent = useCallback(
        async (paymentMethod: AgentCardPaymentMethodSummary): Promise<OrderIntent> => {
            const { amount, merchant, description, expiresAt } = latestProps.current ?? {};
            if (amount == null || merchant == null || description == null) {
                throw new Error("amount, merchant and description are required.");
            }
            const request: OrderIntentRequestFields = {
                amount,
                merchant,
                description,
                expiresAt: expiresAt ?? defaultExpiresAt.current,
            };
            const key = orderIntentCacheKey(paymentMethod.id, request);
            const existingId = cache.current?.get(key);
            if (existingId != null) {
                return await api.getOrderIntent(existingId);
            }
            const orderIntent = await api.createOrderIntent({ paymentMethodId: paymentMethod.id, ...request });
            cache.current?.set(key, orderIntent.orderIntentId);
            return orderIntent;
        },
        [api, cache, latestProps]
    );

    return useCallback(
        async (paymentMethod: AgentCardPaymentMethodSummary) => {
            if (inFlight.current) {
                return;
            }
            inFlight.current = true;
            try {
                let registrationError: string | null = null;
                try {
                    await ensureRegistered(api, paymentMethod.id);
                } catch (error) {
                    registrationError = errorMessage(error, "unknown error");
                    console.warn("[CrossmintAgentCardAuthorization] order-intent registration failed; continuing", {
                        paymentMethodId: paymentMethod.id,
                        message: registrationError,
                    });
                }
                let orderIntent: OrderIntent;
                try {
                    orderIntent = await loadOrderIntent(paymentMethod);
                } catch (error) {
                    fail("order_intent_creation_failed", errorMessage(error, "Could not create the order intent."));
                    return;
                }
                if (mounted.current) {
                    settle(paymentMethod, orderIntent, registrationError);
                }
            } finally {
                inFlight.current = false;
            }
        },
        [api, fail, loadOrderIntent, mounted, settle]
    );
}

export function useAgentCardAuthorization(props: CrossmintAgentCardAuthorizationProps) {
    const { crossmint } = useCrossmint();
    const api = useMemo(
        () => createOrderIntentsApi({ apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }) }),
        [crossmint]
    );

    const [step, setStep] = useState<AgentCardAuthorizationStep>({ kind: "select" });
    const jwt = useStepJwt(crossmint.jwt, step.kind);
    const latestProps = useLatestProps(props);
    const terminal = useTerminalCallbacks(latestProps, setStep);
    useMissingJwtReport(crossmint.jwt, terminal.fail);

    const cache = useOrderIntentCache();
    const { settle, awaitRailActive } = useRailSettlement(api, terminal, cache, setStep);
    const authorize = useAuthorizeCard(api, terminal, latestProps, cache, settle);

    const onPaymentMethodSelected = useCallback(
        (paymentMethod: unknown) => {
            const summary = toAgentCardPaymentMethodSummary(paymentMethod);
            if (summary == null) {
                terminal.fail("payment_method_selection_failed", "The selected payment method is not a card.");
                return;
            }
            void authorize(summary);
        },
        [authorize, terminal]
    );

    const onRailStepComplete = useCallback((pending: PendingStep) => void awaitRailActive(pending), [awaitRailActive]);

    const onRailStepError = useCallback(
        (error: unknown) => terminal.fail("verification_failed", errorMessage(error, "Rail verification failed.")),
        [terminal]
    );

    return { jwt, step, onPaymentMethodSelected, onRailStepComplete, onRailStepError };
}
