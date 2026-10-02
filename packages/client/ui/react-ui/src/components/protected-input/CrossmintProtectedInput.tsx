import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintProtectedInputProps,
    type CrossmintProtectedInputRef,
    type ProtectedInputCollectionResult,
    type ProtectedInputIFrameEmitter,
    createProtectedInputService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";

const useCommittedLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const unavailable = (): ProtectedInputCollectionResult => ({
    status: "unavailable",
    code: "collector_unavailable",
    message: "The protected field is unavailable. Please try again.",
});
const superseded = (): ProtectedInputCollectionResult => ({
    status: "superseded",
    message: "The protected field changed. Please collect it again.",
});

/**
 * Collect a protected text or numeric field in a Crossmint-hosted iframe.
 * Call `ref.collect()` from your submit action to receive a protected reference or a collection error.
 * Your page renders the label, button, and error message; collection keeps the entered value out of application JavaScript.
 */
export const CrossmintProtectedInput = forwardRef<CrossmintProtectedInputRef, CrossmintProtectedInputProps>(
    function CrossmintProtectedInput(props, ref) {
        const { crossmint } = useCrossmint();
        const service = useMemo(
            () =>
                createProtectedInputService({
                    apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }),
                }),
            [crossmint]
        );
        const url = service.iframe.getUrl(props);
        const iframe = useRef<HTMLIFrameElement>(null);
        const connection = useRef<{ client: ProtectedInputIFrameEmitter; ready: Promise<void> } | null>(null);
        const stamp = JSON.stringify([props.field, props.jwt, crossmint.apiKey, props.expiresAt]);
        const current = useRef({ props, apiKey: crossmint.apiKey, stamp, revision: 0 });
        const pending = useRef<{
            client: ProtectedInputIFrameEmitter;
            requestId: string;
            identity: string;
            promise: Promise<ProtectedInputCollectionResult>;
            cancel: () => void;
        } | null>(null);
        const [height, setHeight] = useState(48);
        const [loaded, setLoaded] = useState<{ url: string } | null>(null);

        function identity() {
            return `${current.current.revision}:${current.current.stamp}`;
        }

        // An abandoned concurrent render must not change the buyer of an active collection.
        useCommittedLayoutEffect(() => {
            current.current = {
                props,
                apiKey: crossmint.apiKey,
                stamp,
                revision: current.current.revision + (current.current.stamp === stamp ? 0 : 1),
            };
        }, [props, crossmint.apiKey, stamp]);

        useCommittedLayoutEffect(() => {
            if (iframe.current == null || loaded?.url !== url) {
                return;
            }
            const client = service.iframe.createClient(iframe.current);
            const active = { client, ready: client.handshakeWithChild() };
            active.ready.catch(() => {
                /* collect() reports a blocked iframe. */
            });
            connection.current = active;
            const listener = client.on("ui:height.changed", ({ height }) => setHeight(height));
            return () => {
                client.off(listener);
                if (pending.current?.client === client) {
                    pending.current.cancel();
                    pending.current = null;
                }
                if (connection.current === active) {
                    connection.current = null;
                }
            };
        }, [url, loaded, service]);

        useEffect(() => {
            const active = connection.current;
            if (active == null || loaded?.url !== url) {
                return;
            }
            active.ready
                .then(() => {
                    if (connection.current === active) {
                        active.client.send("protected-input:state", {
                            disabled: props.disabled ?? false,
                            invalid: props.invalid ?? false,
                        });
                    }
                })
                .catch(() => {
                    /* collect() reports transport failures to the developer. */
                });
        }, [props.disabled, props.invalid, url, loaded]);

        // Reset before a parent layout effect can start collection for the committed buyer.
        useCommittedLayoutEffect(() => {
            const committedIdentity = identity();
            if (pending.current != null && pending.current.identity !== committedIdentity) {
                pending.current.cancel();
                pending.current = null;
            }
            const active = connection.current;
            if (active == null || loaded?.url !== url) {
                return;
            }
            active.ready
                .then(() => {
                    if (connection.current === active && identity() === committedIdentity) {
                        active.client.send("protected-input:reset", {});
                    }
                })
                .catch(() => {
                    /* collect() reports a blocked channel. */
                });
        }, [stamp, loaded, url]);

        useImperativeHandle(ref, () => ({
            collect() {
                const active = connection.current;
                if (active == null) {
                    return Promise.resolve(unavailable());
                }
                const stamp = identity();
                if (pending.current?.identity === stamp && pending.current.client === active.client) {
                    return pending.current.promise;
                }
                if (pending.current != null) {
                    pending.current.cancel();
                    pending.current = null;
                }
                const { props, apiKey } = current.current;
                const requestId = crypto.randomUUID();
                const controller = new AbortController();
                let cancel = () => controller.abort();
                const cancelled = new Promise<ProtectedInputCollectionResult>((resolve) => {
                    cancel = () => {
                        controller.abort();
                        resolve(superseded());
                    };
                });
                const operation: Promise<ProtectedInputCollectionResult> =
                    (async (): Promise<ProtectedInputCollectionResult> => {
                        try {
                            await active.ready;
                            if (connection.current !== active || identity() !== stamp) {
                                return superseded();
                            }
                            const { result } = await active.client.sendAction({
                                event: "protected-input:collect",
                                data: { requestId, jwt: props.jwt, apiKey, expiresAt: props.expiresAt },
                                responseEvent: "protected-input:result",
                                options: {
                                    timeoutMs: 30_000,
                                    signal: controller.signal,
                                    condition: (response) => response.requestId === requestId,
                                },
                            });
                            return connection.current === active && identity() === stamp ? result : superseded();
                        } catch {
                            return connection.current === active && identity() === stamp ? unavailable() : superseded();
                        }
                    })();
                const promise = Promise.race([operation, cancelled]).finally(() => {
                    if (pending.current?.requestId === requestId) {
                        pending.current = null;
                    }
                });
                pending.current = { client: active.client, requestId, identity: stamp, promise, cancel };
                return promise;
            },
        }));

        return (
            <iframe
                ref={iframe}
                src={url}
                onLoad={() => setLoaded({ url })}
                title={props.field.label || "Protected input"}
                // The hosted control reserves 4px for border/focus paint inside the frame.
                style={{
                    border: "none",
                    width: "calc(100% + 8px)",
                    margin: "-4px",
                    overflow: "hidden",
                    display: "block",
                    height: `${height}px`,
                }}
            />
        );
    }
);
