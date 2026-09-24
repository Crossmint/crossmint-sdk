import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import {
    type CrossmintProtectedInputProps,
    type ProtectedInputIFrameEmitter,
    createProtectedInputService,
    validateProtectedInputProps,
} from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { type RefObject, useEffect, useId, useMemo, useRef, useState } from "react";

type ProtectedInputService = ReturnType<typeof createProtectedInputService>;

/** How long the Crossmint auth provider gets to load a session before `missing_jwt` is reported. */
export const MISSING_JWT_GRACE_MS = 3_000;
/** How long the hosted page gets to report in (its first height) before `load_timeout` is reported. */
export const LOAD_TIMEOUT_MS = 15_000;

/** Always holds the latest props, so a listener subscribed once still calls the current callbacks. */
function useLatestProps(props: CrossmintProtectedInputProps) {
    const latestProps = useRef(props);
    useEffect(() => {
        latestProps.current = props;
    });
    return latestProps;
}

/** Resolved in an effect so server rendering never touches `window` and hydration matches. */
function useEmbeddingOrigin() {
    const [targetOrigin, setTargetOrigin] = useState<string | null>(null);
    useEffect(() => {
        setTargetOrigin(window.location.origin);
    }, []);
    return targetOrigin;
}

/**
 * The JWT the iframe was opened with. A token refresh (value to value) keeps it, so the iframe
 * and whatever the buyer typed survive; only a logout (value to undefined) drops it, and the
 * next login opens a fresh iframe.
 */
function useSessionJwt(jwt: string | undefined) {
    const [sessionJwt, setSessionJwt] = useState(jwt);
    useEffect(() => {
        if (jwt == null || sessionJwt == null) {
            setSessionJwt(jwt);
        }
    }, [jwt, sessionJwt]);
    return sessionJwt;
}

/**
 * Reports `missing_jwt` when no JWT shows up within the grace period, which covers an auth
 * provider that loads its session asynchronously. Re-arms once a JWT is present, so a later
 * logout is reported again.
 */
function useMissingJwtReport(jwt: string | undefined, latestProps: RefObject<CrossmintProtectedInputProps>) {
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
            latestProps.current?.onError?.({
                code: "missing_jwt",
                message: "CrossmintProtectedInput needs a buyer JWT in the Crossmint context before it can render.",
            });
        }, MISSING_JWT_GRACE_MS);
        return () => clearTimeout(timer);
    }, [jwt, latestProps]);
}

/** Reports `invalid_params` once per distinct problem, before any iframe is mounted. */
function useInvalidParamsReport(validationError: string | null, latestProps: RefObject<CrossmintProtectedInputProps>) {
    useEffect(() => {
        if (validationError == null) {
            return;
        }
        latestProps.current?.onError?.({ code: "invalid_params", message: validationError });
    }, [validationError, latestProps]);
}

/**
 * Opens the iframe channel once the iframe is rendered, and drops it whenever the iframe is
 * replaced, so the client never stays bound to a detached iframe's contentWindow.
 */
function useProtectedInputIframeClient(
    ref: RefObject<HTMLIFrameElement | null>,
    service: ProtectedInputService,
    rendered: boolean,
    iframeKey: string
) {
    const [iframeClient, setIframeClient] = useState<ProtectedInputIFrameEmitter | null>(null);
    useEffect(() => {
        const iframe = ref.current;
        if (!rendered || iframe == null) {
            return;
        }
        setIframeClient(service.iframe.createClient(iframe));
        return () => setIframeClient(null);
        // iframeKey changes exactly when the iframe element is replaced.
    }, [ref, service, rendered, iframeKey]);
    return iframeClient;
}

/**
 * Routes the hosted page events to the latest callbacks. Returns the relayed height (reset to
 * 0 for every new iframe) and whether the page has reported in yet.
 */
function useProtectedInputEvents(
    iframeClient: ProtectedInputIFrameEmitter | null,
    latestProps: RefObject<CrossmintProtectedInputProps>
) {
    const [height, setHeight] = useState(0);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        setHeight(0);
        setLoaded(false);
        if (iframeClient == null) {
            return;
        }
        const heightListener = iframeClient.on("ui:height.changed", (data) => {
            setHeight(data.height);
            setLoaded(true);
        });
        const createdListener = iframeClient.on("protected-input:created", (data) =>
            latestProps.current?.onCreated?.(data)
        );
        const errorListener = iframeClient.on("protected-input:error", (data) => latestProps.current?.onError?.(data));
        return () => {
            iframeClient.off(heightListener);
            iframeClient.off(createdListener);
            iframeClient.off(errorListener);
        };
    }, [iframeClient, latestProps]);
    return { height, loaded };
}

/**
 * The iframe starts at 0px and only the hosted page can grow it. If the page never reports in
 * (network error, CSP, frame-ancestors), report `load_timeout` instead of staying invisible.
 */
function useLoadTimeout(
    iframeClient: ProtectedInputIFrameEmitter | null,
    loaded: boolean,
    latestProps: RefObject<CrossmintProtectedInputProps>
) {
    useEffect(() => {
        if (iframeClient == null || loaded) {
            return;
        }
        const timer = setTimeout(() => {
            latestProps.current?.onError?.({
                code: "load_timeout",
                message: `The protected-input page did not load within ${LOAD_TIMEOUT_MS / 1000}s.`,
            });
        }, LOAD_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [iframeClient, loaded, latestProps]);
}

export function CrossmintProtectedInputIFrame(props: CrossmintProtectedInputProps) {
    const { crossmint } = useCrossmint();
    const service = useMemo(
        () =>
            createProtectedInputService({ apiClient: createCrossmintApiClient(crossmint, { usageOrigin: "client" }) }),
        [crossmint]
    );
    const { merchantUrl, expiresAt, label } = props;
    const validationError = useMemo(
        () => validateProtectedInputProps({ merchantUrl, expiresAt, label }),
        [merchantUrl, expiresAt, label]
    );

    const ref = useRef<HTMLIFrameElement>(null);
    const iframeId = useId();
    const latestProps = useLatestProps(props);
    const targetOrigin = useEmbeddingOrigin();
    const sessionJwt = useSessionJwt(crossmint.jwt);
    useMissingJwtReport(crossmint.jwt, latestProps);
    useInvalidParamsReport(validationError, latestProps);

    const rendered = validationError == null && sessionJwt != null && targetOrigin != null;
    const iframeKey = `${sessionJwt ?? ""}|${targetOrigin ?? ""}`;
    const iframeClient = useProtectedInputIframeClient(ref, service, rendered, iframeKey);
    const { height, loaded } = useProtectedInputEvents(iframeClient, latestProps);
    useLoadTimeout(iframeClient, loaded, latestProps);

    if (!rendered || sessionJwt == null || targetOrigin == null) {
        return null;
    }

    return (
        <iframe
            key={iframeKey}
            ref={ref}
            src={service.iframe.getUrl(props, { jwt: sessionJwt, targetOrigin })}
            id={`crossmint-protected-input.iframe:${iframeId}`}
            title="Protected input"
            style={{
                border: "none",
                width: "100%",
                overflow: "hidden",
                display: "block",
                height: `${height}px`,
            }}
        />
    );
}
