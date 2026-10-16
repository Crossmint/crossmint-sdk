import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintPaymentMethodManagementProps,
    type CrossmintPaymentMethodManagementRef,
    type PaymentMethodManagementIFrameEmitter,
    type PaymentMethodSubmitResult,
    createPaymentMethodManagementService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { generateRandomString } from "@crossmint/client-sdk-window";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";

const useCommittedLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
// A save is two Basis Theory tokenizations, the create call and the card art lookup.
const SUBMIT_TIMEOUT_MS = 60_000;

const unavailable = (message: string): PaymentMethodSubmitResult => ({ status: "unavailable", message });
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
        />
    );
});

const PaymentMethodConnection = forwardRef<
    CrossmintPaymentMethodManagementRef,
    {
        url: string;
        service: ReturnType<typeof createPaymentMethodManagementService>;
        props: CrossmintPaymentMethodManagementProps;
        height: number;
        onHeightChange: (height: number) => void;
    }
>(function PaymentMethodConnection({ url, service, props, height, onHeightChange }, ref) {
    const [iframeService] = useState(service);
    const iframe = useRef<HTMLIFrameElement>(null);
    // The first `load` only confirms the mount-time connection; SSR hydration can miss it,
    // so connecting must not wait for it. Later loads mean the iframe navigated and need a
    // new client.
    const [reloads, setReloads] = useState(0);
    const sawFirstLoad = useRef(false);
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
        if (iframe.current == null) {
            return;
        }
        const client = iframeService.iframe.createClient(iframe.current);
        // Keep successful readiness, but discard a failed handshake so a later
        // submit can retry without reloading the iframe.
        let ready: Promise<void> | undefined;
        const active = {
            client,
            ready: () => {
                ready ??= client.handshakeWithChild().catch((error) => {
                    ready = undefined;
                    throw error;
                });
                return ready;
            },
        };
        active.ready().catch(() => {
            /* submit() reports a blocked channel. */
        });
        connection.current = active;
        const heightListener = client.on("ui:height.changed", ({ height }) => {
            if (connection.current === active) {
                onHeightChange(height);
            }
        });
        const selectedListener = client.on("payment-method:selected", (method) => {
            if (connection.current === active) {
                return latestProps.current.onPaymentMethodSelected?.(method);
            }
        });
        return () => {
            client.off(heightListener);
            client.off(selectedListener);
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
                return Promise.resolve(unavailable("The payment method component has not loaded yet."));
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
                        ? unavailable("The payment method component did not answer. Please try again.")
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
        <iframe
            ref={iframe}
            src={url}
            onLoad={() => {
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
                transition: "ease 0s, opacity 0.4s ease 0.1s",
                height: `${height}px`,
                backgroundColor: "transparent",
            }}
        />
    );
});
