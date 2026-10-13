import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintPaymentMethodManagementProps,
    type CrossmintPaymentMethodManagementRef,
    type PaymentMethodManagementIFrameEmitter,
    type PaymentMethodSubmitResult,
    createPaymentMethodManagementService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

// A save is two Basis Theory tokenizations, the create call and the card art lookup.
const SUBMIT_TIMEOUT_MS = 60_000;

const unavailable = (message: string): PaymentMethodSubmitResult => ({ status: "unavailable", message });

export const CrossmintPaymentMethodManagementIFrame = forwardRef<
    CrossmintPaymentMethodManagementRef,
    CrossmintPaymentMethodManagementProps
>(function CrossmintPaymentMethodManagementIFrame(props, ref) {
    const [iframeClient, setIframeClient] = useState<PaymentMethodManagementIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const iframe = useRef<HTMLIFrameElement>(null);
    // The listeners subscribe once; reading the callback off this ref keeps a late event calling
    // the current props instead of the ones captured at subscribe time.
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });
    const pending = useRef<{ promise: Promise<PaymentMethodSubmitResult>; cancel: () => void } | null>(null);

    const { crossmint } = useCrossmint();
    const service = useMemo(
        () =>
            createPaymentMethodManagementService({
                apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }),
            }),
        [crossmint]
    );
    const url = service.iframe.getUrl(props);

    useEffect(() => {
        if (iframe.current == null || iframeClient != null) {
            return;
        }
        setIframeClient(service.iframe.createClient(iframe.current));
    }, [iframeClient, service]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        const heightListener = iframeClient.on("ui:height.changed", (data) => setHeight(data.height));
        const selectedListener = iframeClient.on("payment-method:selected", (data) =>
            latestProps.current.onPaymentMethodSelected?.(data)
        );
        return () => {
            iframeClient.off(heightListener);
            iframeClient.off(selectedListener);
            pending.current?.cancel();
            pending.current = null;
        };
    }, [iframeClient]);

    useImperativeHandle(
        ref,
        () => ({
            submit() {
                if (iframeClient == null || !loaded) {
                    return Promise.resolve(unavailable("The payment method component has not loaded yet."));
                }
                if (pending.current != null) {
                    return pending.current.promise;
                }
                const requestId = crypto.randomUUID();
                const controller = new AbortController();
                const promise: Promise<PaymentMethodSubmitResult> = iframeClient
                    .sendAction({
                        event: "payment-method:submit",
                        data: { requestId },
                        responseEvent: "payment-method:result",
                        options: {
                            timeoutMs: SUBMIT_TIMEOUT_MS,
                            signal: controller.signal,
                            condition: (response) => response.requestId === requestId,
                        },
                    })
                    .then(
                        ({ result }) => result as PaymentMethodSubmitResult,
                        () => unavailable("The payment method component did not answer. Please try again.")
                    )
                    .finally(() => {
                        if (pending.current?.promise === promise) {
                            pending.current = null;
                        }
                    });
                pending.current = { promise, cancel: () => controller.abort() };
                return promise;
            },
        }),
        [iframeClient, loaded]
    );

    return (
        <iframe
            ref={iframe}
            src={url}
            onLoad={() => setLoaded(true)}
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
