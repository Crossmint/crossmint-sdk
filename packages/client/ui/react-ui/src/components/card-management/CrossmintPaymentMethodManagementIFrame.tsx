import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintPaymentMethodManagementProps,
    type CrossmintPaymentMethodManagementRef,
    type PaymentMethodManagementChangeEvent,
    type PaymentMethodManagementIFrameEmitter,
    type PaymentMethodSubmitResult,
    createPaymentMethodManagementService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { generateRandomString } from "@crossmint/client-sdk-window";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CardFormSkeleton, SavedMethodsSkeleton } from "./CardFormSkeleton";

const useCommittedLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
// A loaded document that has not reported ready by then is shown as it is, so a broken form
// is not hidden behind the skeleton for good.
const REVEAL_UNREADY_AFTER_MS = 8_000;
// The iframe can be ready and report a spinner's height just before its first screen draws.
const FIRST_SCREEN_SETTLE_MS = 150;
const FIRST_SCREEN_KEY = "crossmint.payment-method-management.first-screen:";
// Matches the address suggestions panel opening in the iframe, as Stripe's Address Element does.
const SUGGESTIONS_TRANSITION = "height 0.35s ease, opacity 0.35s ease";
// A save is two Basis Theory tokenizations, the create call and the card art lookup.
const SUBMIT_TIMEOUT_MS = 60_000;

const unavailable = (code: "not_ready" | "timeout", message: string): PaymentMethodSubmitResult => ({
    status: "unavailable",
    code,
    message,
});
const superseded = (): PaymentMethodSubmitResult => ({
    status: "superseded",
    message: "The payment method component changed. Please submit again.",
});

export const CrossmintPaymentMethodManagementIFrame = forwardRef<
    CrossmintPaymentMethodManagementRef,
    CrossmintPaymentMethodManagementProps
>(function CrossmintPaymentMethodManagementIFrame(props, ref) {
    const { crossmint } = useCrossmint();
    const service = useMemo(
        () =>
            createPaymentMethodManagementService({
                apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }),
            }),
        [crossmint]
    );
    const url = service.iframe.getUrl(props);
    // The height survives a `key={url}` remount: the last reported height applies to the
    // new iframe until it reports its own.
    const [height, setHeight] = useState(0);
    // The last state the host got. A new URL reloads the form, so a host that enabled its button on `complete`
    // gets `complete: false` until the new document reports its own state.
    const lastChange = useRef<PaymentMethodManagementChangeEvent | null>(null);
    const latestOnChange = useRef(props.onChange);
    latestOnChange.current = props.onChange;
    const previousUrl = useRef(url);
    useEffect(() => {
        if (previousUrl.current === url) {
            return;
        }
        previousUrl.current = url;
        reportReload(lastChange, latestOnChange.current);
    }, [url]);
    // Authentication and form configuration live in the URL. A committed change must
    // retire the old window too, so its events cannot reach the next buyer's callbacks.
    return (
        <PaymentMethodConnection
            key={url}
            ref={ref}
            url={url}
            service={service}
            props={props}
            height={height}
            onHeightChange={setHeight}
            lastChange={lastChange}
        />
    );
});

// A reloaded form has not reported yet: a host that enabled its button on `complete` gets `complete: false` until the
// new document reports its own state.
function reportReload(
    lastChange: { current: PaymentMethodManagementChangeEvent | null },
    onChange: ((event: PaymentMethodManagementChangeEvent) => void) | undefined
) {
    const last = lastChange.current;
    if (last?.complete !== true) {
        return;
    }
    const reloading = { ...last, complete: false };
    lastChange.current = reloading;
    onChange?.(reloading);
}

const PaymentMethodConnection = forwardRef<
    CrossmintPaymentMethodManagementRef,
    {
        url: string;
        service: ReturnType<typeof createPaymentMethodManagementService>;
        props: CrossmintPaymentMethodManagementProps;
        height: number;
        onHeightChange: (height: number) => void;
        lastChange: { current: PaymentMethodManagementChangeEvent | null };
    }
>(function PaymentMethodConnection({ url, service, props, height, onHeightChange, lastChange }, ref) {
    const [iframeService] = useState(service);
    const iframe = useRef<HTMLIFrameElement>(null);
    // The first `load` only confirms the mount-time connection; SSR hydration can miss it,
    // so connecting must not wait for it. Later loads mean the iframe navigated and need a
    // new client.
    const [reloads, setReloads] = useState(0);
    const sawFirstLoad = useRef(false);
    // Until the form is ready, the skeleton of its first screen shows and the iframe draws unseen behind it,
    // out of the tab order. The screen and height this mount last opened on in this session win over the guess.
    const [formReady, setFormReady] = useState(false);
    const [loads, setLoads] = useState(0);
    const [revealUnready, setRevealUnready] = useState(false);
    const [settled, setSettled] = useState(false);
    const [openedOn, setOpenedOn] = useState<FirstScreen | "other" | null>(null);
    // The form's address suggestions draw in a second iframe laid over the page below its address field, so the list
    // can open downwards past the form without resizing it.
    const [suggestionsChannel, setSuggestionsChannel] = useState<string | null>(null);
    const [suggestionsLayout, setSuggestionsLayout] = useState<SuggestionsLayout>(CLOSED_SUGGESTIONS);
    const suggestionsFrame = useRef<HTMLIFrameElement>(null);
    // Read after mount: the server has no storage, and hydration must match its render.
    const [remembered, setRemembered] = useState<RememberedScreen | null>(null);
    const guess = firstScreen(props);
    const skeleton = guess === "saved" ? remembered?.screen ?? guess : guess;
    const reservedHeight = remembered?.screen === skeleton ? remembered.height : undefined;
    const showSkeleton = skeleton != null && !((settled || revealUnready) && height > 0);
    useEffect(() => {
        if (loads === 0) {
            return;
        }
        const timer = setTimeout(() => setRevealUnready(true), REVEAL_UNREADY_AFTER_MS);
        return () => clearTimeout(timer);
    }, [loads]);
    useCommittedLayoutEffect(() => {
        // Set directly: React before 19 drops a boolean `inert` prop.
        if (iframe.current != null) {
            iframe.current.inert = showSkeleton;
        }
    }, [showSkeleton]);
    useCommittedLayoutEffect(() => {
        if (suggestionsFrame.current != null) {
            suggestionsFrame.current.inert = !suggestionsLayout.open;
        }
    }, [suggestionsChannel, suggestionsLayout.open]);
    const clientRef = useRef<{
        reloads: number;
        client: PaymentMethodManagementIFrameEmitter;
        ready: () => Promise<void>;
    } | null>(null);
    const latestProps = useRef(props);
    const connection = useRef<{ client: PaymentMethodManagementIFrameEmitter; ready: () => Promise<void> } | null>(
        null
    );
    const pending = useRef<{
        client: PaymentMethodManagementIFrameEmitter;
        promise: Promise<PaymentMethodSubmitResult>;
        cancel: () => void;
    } | null>(null);

    useCommittedLayoutEffect(() => {
        latestProps.current = props;
    });
    useCommittedLayoutEffect(() => {
        setRemembered(recallFirstScreen(latestProps.current));
    }, []);
    useEffect(() => {
        if (settled || !formReady || height <= 0) {
            return;
        }
        const timer = setTimeout(() => {
            setSettled(true);
            const screen = openedOn ?? skeleton;
            if (skeleton != null && screen != null && screen !== "other") {
                rememberFirstScreen(latestProps.current, { screen, height });
            }
        }, FIRST_SCREEN_SETTLE_MS);
        return () => clearTimeout(timer);
    }, [settled, formReady, height, openedOn, skeleton]);

    useCommittedLayoutEffect(() => {
        if (iframe.current == null) {
            return;
        }
        // StrictMode re-runs this effect for the same iframe document, but the child
        // answers only one handshake per document: share one client (and its single
        // handshake) per document, while each run still gets a fresh `active`.
        if (clientRef.current?.reloads !== reloads) {
            // The iframe navigated in place: the URL is the same, but the form starts over.
            if (reloads > 0) {
                reportReload(lastChange, latestProps.current.onChange);
                setFormReady(false);
                setRevealUnready(false);
                setSettled(false);
                setOpenedOn(null);
                setSuggestionsLayout(CLOSED_SUGGESTIONS);
            }
            const client = iframeService.iframe.createClient(iframe.current);
            // Keep successful readiness, but discard a failed handshake so a later
            // submit can retry without reloading the iframe.
            let ready: Promise<void> | undefined;
            clientRef.current = {
                reloads,
                client,
                ready: () => {
                    ready ??= client.handshakeWithChild().catch((error) => {
                        ready = undefined;
                        throw error;
                    });
                    return ready;
                },
            };
        }
        const { client, ready } = clientRef.current;
        const active = { client, ready };
        active.ready().catch(() => {
            /* submit() reports a blocked channel. */
        });
        connection.current = active;
        const heightListener = client.on("ui:height.changed", ({ height }) => {
            if (connection.current === active) {
                onHeightChange(height);
            }
        });
        const suggestionsMountListener = client.on("ui:suggestions.mount", ({ channel }) => {
            if (connection.current === active) {
                setSuggestionsChannel(channel);
            }
        });
        const suggestionsLayoutListener = client.on("ui:suggestions.layout", (layout) => {
            if (connection.current === active) {
                setSuggestionsLayout(layout);
            }
        });
        const selectedListener = client.on("payment-method:selected", (method) => {
            if (connection.current === active) {
                return latestProps.current.onPaymentMethodSelected?.(method);
            }
        });
        const readyListener = client.on("payment-method:ready", () => {
            if (connection.current === active) {
                setFormReady(true);
                latestProps.current.onReady?.();
            }
        });
        const changeListener = client.on("payment-method:change", (event) => {
            if (connection.current === active) {
                setOpenedOn((screen) => screen ?? openedScreen(event.mode, latestProps.current));
                lastChange.current = event;
                latestProps.current.onChange?.(event);
            }
        });
        return () => {
            client.off(heightListener);
            client.off(suggestionsMountListener);
            client.off(suggestionsLayoutListener);
            client.off(selectedListener);
            client.off(readyListener);
            client.off(changeListener);
            if (pending.current?.client === client) {
                pending.current.cancel();
                pending.current = null;
            }
            if (connection.current === active) {
                connection.current = null;
            }
        };
    }, [iframeService, reloads]);

    useImperativeHandle(ref, () => ({
        submit() {
            const active = connection.current;
            if (active == null) {
                return Promise.resolve(unavailable("not_ready", "The payment method component has not loaded yet."));
            }
            if (pending.current?.client === active.client) {
                return pending.current.promise;
            }
            const controller = new AbortController();
            let cancel = () => controller.abort();
            const cancelled = new Promise<PaymentMethodSubmitResult>((resolve) => {
                cancel = () => {
                    controller.abort();
                    resolve(superseded());
                };
            });
            const operation = (async (): Promise<PaymentMethodSubmitResult> => {
                try {
                    await active.ready();
                } catch {
                    return connection.current === active
                        ? unavailable("not_ready", "The payment method component did not answer. Please try again.")
                        : superseded();
                }
                if (connection.current !== active) {
                    return superseded();
                }
                try {
                    const requestId = generateRandomString();
                    const { result } = await active.client.sendAction({
                        event: "payment-method:submit",
                        data: { requestId },
                        responseEvent: "payment-method:result",
                        options: {
                            timeoutMs: SUBMIT_TIMEOUT_MS,
                            signal: controller.signal,
                            condition: (response) => response.requestId === requestId,
                        },
                    });
                    return connection.current === active ? (result as PaymentMethodSubmitResult) : superseded();
                } catch {
                    // The request was already sent; the save may still have completed.
                    return connection.current === active
                        ? unavailable(
                              "timeout",
                              "The payment method component did not answer in time. The payment method may still have been saved: onPaymentMethodSelected fires if it was, and submitting again returns it."
                          )
                        : superseded();
                }
            })();
            const promise = Promise.race([operation, cancelled]).finally(() => {
                if (pending.current?.promise === promise) {
                    pending.current = null;
                }
            });
            pending.current = { client: active.client, promise, cancel };
            return promise;
        },
    }));

    return (
        <div style={{ position: "relative", width: "100%" }} aria-busy={showSkeleton || undefined}>
            {showSkeleton ? (
                <div style={{ minHeight: reservedHeight }}>
                    {skeleton === "card" ? (
                        <CardFormSkeleton appearance={props.appearance} />
                    ) : (
                        <SavedMethodsSkeleton appearance={props.appearance} />
                    )}
                </div>
            ) : null}
            <iframe
                ref={iframe}
                src={url}
                onLoad={() => {
                    setLoads((n) => n + 1);
                    if (!sawFirstLoad.current) {
                        sawFirstLoad.current = true;
                        return;
                    }
                    setReloads((n) => n + 1);
                }}
                id="crossmint-payment-method-management.iframe"
                role="crossmint-payment-method-management.iframe"
                allow="payment *; microphone; camera"
                style={{
                    boxShadow: "none",
                    border: "none",
                    padding: "0px",
                    width: "100%",
                    minWidth: "100%",
                    overflow: "hidden",
                    display: "block",
                    userSelect: "none",
                    transform: "translate(0px)",
                    opacity: "1",
                    height: `${height}px`,
                    backgroundColor: "transparent",
                    ...(showSkeleton
                        ? {
                              position: "absolute",
                              top: 0,
                              left: 0,
                              opacity: "0",
                              pointerEvents: "none",
                          }
                        : {}),
                }}
            />
            {suggestionsChannel != null ? (
                <iframe
                    ref={suggestionsFrame}
                    src={iframeService.iframe.getSuggestionsUrl(props, suggestionsChannel)}
                    title="Address suggestions"
                    // The address field keeps focus and drives the list with the arrow keys.
                    tabIndex={-1}
                    style={{
                        position: "absolute",
                        zIndex: 1,
                        top: `${suggestionsLayout.top}px`,
                        left: `${suggestionsLayout.left}px`,
                        width: `${suggestionsLayout.width}px`,
                        height: `${suggestionsLayout.open ? suggestionsLayout.height : 0}px`,
                        opacity: suggestionsLayout.open ? "1" : "0",
                        pointerEvents: suggestionsLayout.open ? "auto" : "none",
                        transition: SUGGESTIONS_TRANSITION,
                        border: "none",
                        padding: "0px",
                        margin: "0px",
                        display: "block",
                        overflow: "hidden",
                        backgroundColor: "transparent",
                    }}
                />
            ) : null}
        </div>
    );
});

type SuggestionsLayout = { open: boolean; top: number; left: number; width: number; height: number };
const CLOSED_SUGGESTIONS: SuggestionsLayout = { open: false, top: 0, left: 0, width: 0, height: 0 };

// With saved methods allowed, the iframe opens on the choice between them and a new one (bare form when
// nothing is saved yet); otherwise on the first type's form, of which only the card's has a skeleton.
type FirstScreen = "saved" | "card";
type RememberedScreen = { screen: FirstScreen; height: number };

function firstScreen({
    allowedModes,
    allowedPaymentMethodTypes,
}: CrossmintPaymentMethodManagementProps): FirstScreen | null {
    if (allowedModes?.includes("existing")) {
        return "saved";
    }
    if ((allowedPaymentMethodTypes?.[0] ?? "card") === "card") {
        return "card";
    }
    return null;
}

// The change event only says "new": that is the card form only when cards come first.
function openedScreen(
    mode: "new" | "existing",
    { allowedPaymentMethodTypes }: CrossmintPaymentMethodManagementProps
): FirstScreen | "other" {
    if (mode === "existing") {
        return "saved";
    }
    return (allowedPaymentMethodTypes?.[0] ?? "card") === "card" ? "card" : "other";
}

// Per tab and per configuration: with saved methods allowed, a buyer with none opens on the card form.
function firstScreenKey({
    allowedModes,
    allowedPaymentMethodTypes,
    appearance,
}: CrossmintPaymentMethodManagementProps) {
    return (
        FIRST_SCREEN_KEY + JSON.stringify([allowedModes ?? null, allowedPaymentMethodTypes ?? null, appearance ?? null])
    );
}

function recallFirstScreen(
    props: CrossmintPaymentMethodManagementProps
): { screen: FirstScreen; height: number } | null {
    try {
        const stored = JSON.parse(window.sessionStorage.getItem(firstScreenKey(props)) ?? "null");
        if ((stored?.screen === "saved" || stored?.screen === "card") && typeof stored.height === "number") {
            return { screen: stored.screen, height: stored.height };
        }
    } catch {
        /* No storage (SSR, blocked storage): fall back to the guess. */
    }
    return null;
}

function rememberFirstScreen(
    props: CrossmintPaymentMethodManagementProps,
    value: { screen: FirstScreen; height: number }
) {
    try {
        window.sessionStorage.setItem(firstScreenKey(props), JSON.stringify(value));
    } catch {
        /* No storage: the next mount guesses again. */
    }
}
