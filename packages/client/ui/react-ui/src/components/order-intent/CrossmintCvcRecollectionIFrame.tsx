import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintCvcRecollectionProps,
    type CrossmintCvcRecollectionRef,
    type CvcRecollectionIFrameEmitter,
    type CvcRecollectionSubmitResult,
    createCvcRecollectionService,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { generateRandomString } from "@crossmint/client-sdk-window";
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";

const useCommittedLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
// A confirm is one Basis Theory update plus the complete call.
const SUBMIT_TIMEOUT_MS = 60_000;

const unavailable = (message: string): CvcRecollectionSubmitResult => ({ status: "unavailable", message });
const superseded = (): CvcRecollectionSubmitResult => ({
    status: "superseded",
    message: "The CVC recollection component changed. Please submit again.",
});

export const CrossmintCvcRecollectionIFrame = forwardRef<CrossmintCvcRecollectionRef, CrossmintCvcRecollectionProps>(
    function CrossmintCvcRecollectionIFrame(props, ref) {
        const { crossmint } = useCrossmint();
        const service = useMemo(
            () =>
                createCvcRecollectionService({
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
            <CvcConnection
                key={url}
                ref={ref}
                url={url}
                service={service}
                props={props}
                height={height}
                onHeightChange={setHeight}
            />
        );
    }
);

const CvcConnection = forwardRef<
    CrossmintCvcRecollectionRef,
    {
        url: string;
        service: ReturnType<typeof createCvcRecollectionService>;
        props: CrossmintCvcRecollectionProps;
        height: number;
        onHeightChange: (height: number) => void;
    }
>(function CvcConnection({ url, service, props, height, onHeightChange }, ref) {
    const [iframeService] = useState(service);
    const iframe = useRef<HTMLIFrameElement>(null);
    // The first `load` only confirms the mount-time connection; SSR hydration can miss it,
    // so connecting must not wait for it. Later loads mean the iframe navigated: each bumps
    // the document epoch that decides whether the client's handshake is still bound.
    const [reloads, setReloads] = useState(0);
    const sawFirstLoad = useRef(false);
    const loadEpoch = useRef(0);
    const clientRef = useRef<{
        client: CvcRecollectionIFrameEmitter;
        ready: () => Promise<void>;
        // Document epoch the handshake resolved against; null while pending or failed.
        readyEpoch: number | null;
    } | null>(null);
    const latestProps = useRef(props);
    const connection = useRef<{ client: CvcRecollectionIFrameEmitter; ready: () => Promise<void> } | null>(null);
    const pending = useRef<{
        client: CvcRecollectionIFrameEmitter;
        promise: Promise<CvcRecollectionSubmitResult>;
        cancel: () => void;
    } | null>(null);

    useCommittedLayoutEffect(() => {
        latestProps.current = props;
    });

    useCommittedLayoutEffect(() => {
        if (iframe.current == null) {
            return;
        }
        // A cross-origin iframe exposes no contentDocument while loading or once loaded,
        // so the first observed `load` cannot be told apart from the document's own first
        // load: it never counts. Every later `load` is a real navigation and bumps the
        // document epoch, and a client belongs to the document that answered its handshake.
        // A pending handshake keeps the client as well: a child document answers only one
        // handshake, and the outstanding one's retries are what the new document can answer
        // — replacing the client would race two handshakes for a document that replies to
        // one. It keeps its original deadline; once it expires a later submit handshakes
        // again, which the still-unanswered new document then answers.
        let entry = clientRef.current;
        if (entry == null || (entry.readyEpoch != null && entry.readyEpoch < loadEpoch.current)) {
            const client = iframeService.iframe.createClient(iframe.current);
            // Keep successful readiness, but discard a failed handshake so a later
            // submit can retry without reloading the iframe.
            let ready: Promise<void> | undefined;
            const created = {
                client,
                readyEpoch: null as number | null,
                ready: () => {
                    ready ??= client
                        .handshakeWithChild()
                        .then(() => {
                            created.readyEpoch = loadEpoch.current;
                        })
                        .catch((error) => {
                            ready = undefined;
                            throw error;
                        });
                    return ready;
                },
            };
            entry = created;
            clientRef.current = created;
        }
        const { client, ready } = entry;
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
        // cvc:complete carries an empty object; the callback deliberately receives nothing.
        const completeListener = client.on("cvc:complete", () => {
            if (connection.current === active) {
                latestProps.current.onComplete?.();
            }
        });
        const errorListener = client.on("cvc:error", (error) => {
            if (connection.current === active) {
                latestProps.current.onError?.(error);
            }
        });
        return () => {
            client.off(heightListener);
            client.off(completeListener);
            client.off(errorListener);
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
                return Promise.resolve(unavailable("The CVC recollection component has not loaded yet."));
            }
            if (pending.current?.client === active.client) {
                return pending.current.promise;
            }
            const controller = new AbortController();
            let cancel = () => controller.abort();
            const cancelled = new Promise<CvcRecollectionSubmitResult>((resolve) => {
                cancel = () => {
                    controller.abort();
                    resolve(superseded());
                };
            });
            const operation = (async (): Promise<CvcRecollectionSubmitResult> => {
                try {
                    await active.ready();
                } catch {
                    return connection.current === active
                        ? unavailable("The CVC recollection component did not answer. Please try again.")
                        : superseded();
                }
                if (connection.current !== active) {
                    return superseded();
                }
                try {
                    const requestId = generateRandomString();
                    const { result } = await active.client.sendAction({
                        event: "cvc:submit",
                        data: { requestId },
                        responseEvent: "cvc:result",
                        options: {
                            timeoutMs: SUBMIT_TIMEOUT_MS,
                            signal: controller.signal,
                            condition: (response) => response.requestId === requestId,
                        },
                    });
                    return connection.current === active ? (result as CvcRecollectionSubmitResult) : superseded();
                } catch {
                    // The request was already sent; the update may still have completed.
                    return connection.current === active
                        ? unavailable(
                              "The CVC recollection component did not answer in time. The CVC may still have been updated: onComplete fires if it was, and submitting again returns the outcome."
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
                loadEpoch.current += 1;
                setReloads((n) => n + 1);
            }}
            id="crossmint-cvc-recollection.iframe"
            title="CVC recollection"
            style={{
                border: "none",
                width: "100%",
                overflow: "hidden",
                display: "block",
                height: `${height}px`,
            }}
        />
    );
});
