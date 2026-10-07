import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import {
    type AgentCheckoutBrowserProfileListResponseDto,
    type AgentCheckoutBrowserProfileResponseDto,
    type AgentCheckoutBuyerProfileListResponseDto,
    type AgentCheckoutBuyerProfileResponseDto,
    type AgentCheckoutCancellationAcceptedDto,
    type AgentCheckoutListResponseDto,
    type AgentCheckoutMessageAcceptedDto,
    type AgentCheckoutMessageListResponseDto,
    type AgentCheckoutResponseDto,
    type AgentCheckoutsListData,
    type AgentCheckoutsMessagesStreamResponse,
    type CreateAgentCheckoutBrowserProfileDto,
    type CreateAgentCheckoutBuyerProfileDto,
    type CreateAgentCheckoutDto,
    CrossmintSdk,
    type SendAgentCheckoutMessageDto,
    type UpdateAgentCheckoutBrowserProfileDto,
    type UpdateAgentCheckoutBuyerProfileDto,
    createCrossmintClient,
} from "@crossmint/rest-js";

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(["succeeded", "blocked", "cancelled", "failed"]);
const AGENT_CHECKOUT_STATUSES: ReadonlySet<string> = new Set<AgentCheckoutStatus>([
    "queued",
    "running",
    "awaiting_input",
    "succeeded",
    "blocked",
    "cancelled",
    "failed",
]);
const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_EMPTY_RECONNECTS = 3;

// ---- Wire shapes, from the types `@crossmint/rest-js` generates from the Crossmint API's OpenAPI spec.

export type AgentCheckout = AgentCheckoutResponseDto;
export type AgentCheckoutStatus = AgentCheckout["status"];
export type AgentCheckoutPage = AgentCheckoutListResponseDto;
export type AgentCheckoutMessagePage = AgentCheckoutMessageListResponseDto;
export type AgentCheckoutMessage = AgentCheckoutMessagePage["data"][number];
/** A `run.updated` payload. The spec types stream data loosely; the SDK checks only the fields it reads. */
export type AgentCheckoutUpdate = AgentCheckoutsMessagesStreamResponse & { runId: string; status: AgentCheckoutStatus };
export type AcceptedAgentCheckoutMessage = AgentCheckoutMessageAcceptedDto;
export type AcceptedAgentCheckoutCancel = AgentCheckoutCancellationAcceptedDto;
export type AgentCheckoutBuyerProfile = AgentCheckoutBuyerProfileResponseDto;
export type AgentCheckoutBuyerProfilePage = AgentCheckoutBuyerProfileListResponseDto;
export type AgentCheckoutBuyerProfileInput = CreateAgentCheckoutBuyerProfileDto;
export type AgentCheckoutBuyerProfileUpdate = UpdateAgentCheckoutBuyerProfileDto;
export type AgentCheckoutBrowserProfile = AgentCheckoutBrowserProfileResponseDto;
export type AgentCheckoutBrowserProfilePage = AgentCheckoutBrowserProfileListResponseDto;
export type AgentCheckoutBrowserProfileInput = CreateAgentCheckoutBrowserProfileDto;
export type AgentCheckoutBrowserProfileUpdate = UpdateAgentCheckoutBrowserProfileDto;
export type CreateAgentCheckoutInput = CreateAgentCheckoutDto;
/** A Crossmint-run browser (`profileId`, `location`) or your own browser (`cdp`); the API refuses both. */
export type AgentCheckoutBrowserRequest = NonNullable<CreateAgentCheckoutInput["browser"]>;
/**
 * A browser you run, controlled through the Chrome DevTools Protocol. Universal Checkout connects
 * to it and disconnects when done; it never launches or closes it. In production the URL must be
 * a `wss://` URL to a public host. The URL and headers are treated as secrets: the API never
 * returns them, and a run's input shows only `{ redacted: true }`.
 */
export type AgentCheckoutCdpBrowser = NonNullable<AgentCheckoutBrowserRequest["cdp"]>;
export type SendAgentCheckoutMessageInput = SendAgentCheckoutMessageDto;
export type AgentCheckoutMessagePart = SendAgentCheckoutMessageInput["parts"][number];
export type AgentCheckoutInputResponse = Extract<AgentCheckoutMessagePart, { type: "input_response" }>;
export type AgentCheckoutProfilePage<T> = { data: T[]; nextCursor: string | null };
export type PageOptions = NonNullable<AgentCheckoutsListData["query"]>;

export type AgentCheckoutStreamEvent =
    | { type: "message.upsert"; cursor: string; message: AgentCheckoutMessage }
    | { type: "run.updated"; cursor: string; run: AgentCheckoutUpdate };

export interface StreamAgentCheckoutMessagesOptions {
    /** Resume after this cursor: a page's `streamCursor` or a previous event's `cursor`. */
    after?: string;
    signal?: AbortSignal;
    /** Delay before reconnecting a closed stream; a server `retry:` field overrides it. */
    reconnectDelayMs?: number;
    /**
     * Connections in a row that may close without delivering an event before the stream gives up
     * with a `resync_required` error. The API closes the stream on a cursor it no longer accepts,
     * so endless empty reconnects mean the caller has to re-read the conversation.
     */
    maxEmptyReconnects?: number;
}

export type AgentCheckoutsApiErrorCode = "resync_required" | "network_error";

export class AgentCheckoutsApiError extends Error {
    constructor(
        message: string,
        public readonly status: number | undefined,
        public readonly path: string,
        public readonly body?: unknown,
        public readonly code?: AgentCheckoutsApiErrorCode,
        /** The underlying failure of a `network_error`. */
        public readonly cause?: unknown
    ) {
        super(message);
        this.name = "AgentCheckoutsApiError";
    }
}

export type AgentCheckoutsApiProps = {
    apiClient: CrossmintApiClient;
};

type Result<T> = { data?: T; error?: unknown; request?: Request; response?: Response };

type StreamState = { cursor: string | undefined; delayMs: number };

/** How one stream connection ended: `done` when the stream is over, `failure` when the connection failed. */
type ConnectionOutcome = { delivered: boolean; done: boolean; failure?: AgentCheckoutsApiError };

/**
 * Agent checkouts: an AI agent buys on a merchant's site for the signed-in buyer. Every request
 * carries `x-api-key` and, when the API client has one, `Authorization: Bearer <jwt>`; the API
 * requires the client key's `agent-checkouts.*` scopes and a buyer JWT. Every failure surfaces as
 * `AgentCheckoutsApiError`.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export function createAgentCheckoutsApi({ apiClient }: AgentCheckoutsApiProps) {
    const { agentCheckouts } = new CrossmintSdk({ client: createGeneratedClient(apiClient) });

    async function call<T>(operation: Promise<Result<T>>): Promise<T> {
        const { data, error, request, response } = await operation;
        if (response === undefined) {
            throw networkError(request === undefined ? "" : pathOf(request), error);
        }
        const path = pathOf(request ?? response);
        if (!response.ok) {
            throw toApiError(response, path, error);
        }
        // Returned as received, so fields newer than the published spec reach callers.
        return data as T;
    }

    async function* streamMessages(
        id: string,
        options: StreamAgentCheckoutMessagesOptions = {}
    ): AsyncGenerator<AgentCheckoutStreamEvent> {
        const maxEmpty = options.maxEmptyReconnects ?? DEFAULT_MAX_EMPTY_RECONNECTS;
        const state: StreamState = {
            cursor: options.after,
            delayMs: options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS,
        };
        let emptyConnections = 0;

        while (!options.signal?.aborted) {
            const { delivered, done, failure } = yield* readConnection(id, state, options.signal);
            if (done || options.signal?.aborted) {
                return;
            }
            if (failure?.status === 409) {
                throw new AgentCheckoutsApiError(failure.message, 409, failure.path, failure.body, "resync_required");
            }
            if (failure?.status !== undefined && failure.status < 500) {
                throw failure;
            }
            emptyConnections = delivered ? 0 : emptyConnections + 1;
            if (emptyConnections > maxEmpty) {
                throw (
                    failure ??
                    new AgentCheckoutsApiError(
                        "The message stream keeps closing without events; re-read the conversation and resubscribe from its streamCursor",
                        undefined,
                        streamPath(id),
                        undefined,
                        "resync_required"
                    )
                );
            }
            await sleep(state.delayMs, options.signal);
        }
    }

    /** One stream connection, closed (and its body cancelled) however the caller stops reading it. */
    async function* readConnection(
        id: string,
        state: StreamState,
        signal: AbortSignal | undefined
    ): AsyncGenerator<AgentCheckoutStreamEvent, ConnectionOutcome> {
        const connection = new AbortController();
        const abort = () => connection.abort();
        signal?.addEventListener("abort", abort, { once: true });
        const { cursor } = state;
        let path = streamPath(id);
        let failure: AgentCheckoutsApiError | undefined;
        let frame: { event?: string; id?: string; retry?: number } | undefined;
        let complete = false;
        let delivered = false;

        try {
            const { stream } = await agentCheckouts.messages.stream({
                path: { id },
                ...(cursor === undefined ? {} : { query: { after: cursor } }),
                headers: { Accept: "text/event-stream", ...(cursor === undefined ? {} : { "last-event-id": cursor }) },
                cache: "no-store",
                signal: connection.signal,
                // One attempt per connection: reconnects, cursors and the empty-connection budget are ours.
                sseMaxRetryAttempts: 1,
                sseDefaultRetryDelay: state.delayMs,
                fetch: async (request) => {
                    path = pathOf(request);
                    let response: Response;
                    try {
                        response = await globalThis.fetch(request);
                    } catch (cause) {
                        failure = networkError(path, cause);
                        throw cause;
                    }
                    if (!response.ok) {
                        failure = toApiError(response, path, await readBody(response));
                        return response;
                    }
                    return withLineFeeds(response, connection.signal);
                },
                onSseEvent: (event) => {
                    frame = event;
                    complete ||= event.event === "stream.complete";
                },
            });

            for await (const data of stream) {
                if (complete) {
                    return { delivered, done: true };
                }
                if (frame?.retry !== undefined) {
                    state.delayMs = frame.retry;
                }
                const event = toStreamEvent(frame, data, path);
                if (event === undefined) {
                    continue;
                }
                delivered = true;
                state.cursor = event.cursor;
                yield event;
                if (event.type === "run.updated" && TERMINAL_STATUSES.has(event.run.status)) {
                    return { delivered, done: true };
                }
            }
            return { delivered, done: complete, failure };
        } finally {
            signal?.removeEventListener("abort", abort);
            connection.abort();
        }
    }

    return {
        create: (input: CreateAgentCheckoutInput): Promise<AgentCheckout> =>
            call(agentCheckouts.create({ body: input })),
        get: (id: string): Promise<AgentCheckout> => call(agentCheckouts.get({ path: { id } })),
        list: (options: PageOptions = {}): Promise<AgentCheckoutPage> => call(agentCheckouts.list({ query: options })),
        cancel: (id: string): Promise<AcceptedAgentCheckoutCancel> => call(agentCheckouts.cancel({ path: { id } })),
        listMessages: (id: string, options: PageOptions = {}): Promise<AgentCheckoutMessagePage> =>
            call(agentCheckouts.messages.list({ path: { id }, query: options })),
        sendMessage: (id: string, message: SendAgentCheckoutMessageInput): Promise<AcceptedAgentCheckoutMessage> =>
            call(agentCheckouts.messages.create({ path: { id }, body: message })),
        streamMessages,
        buyerProfiles: {
            list: (options: PageOptions = {}): Promise<AgentCheckoutBuyerProfilePage> =>
                call(agentCheckouts.buyerProfiles.list({ query: options })),
            get: (id: string): Promise<AgentCheckoutBuyerProfile> =>
                call(agentCheckouts.buyerProfiles.get({ path: { id } })),
            create: (input: AgentCheckoutBuyerProfileInput): Promise<AgentCheckoutBuyerProfile> =>
                call(agentCheckouts.buyerProfiles.create({ body: input })),
            update: (id: string, input: AgentCheckoutBuyerProfileUpdate): Promise<AgentCheckoutBuyerProfile> =>
                call(agentCheckouts.buyerProfiles.update({ path: { id }, body: input })),
            async delete(id: string): Promise<void> {
                await call(agentCheckouts.buyerProfiles.delete({ path: { id } }));
            },
        },
        browserProfiles: {
            list: (options: PageOptions = {}): Promise<AgentCheckoutBrowserProfilePage> =>
                call(agentCheckouts.browserProfiles.list({ query: options })),
            get: (id: string): Promise<AgentCheckoutBrowserProfile> =>
                call(agentCheckouts.browserProfiles.get({ path: { id } })),
            create: (input: AgentCheckoutBrowserProfileInput = {}): Promise<AgentCheckoutBrowserProfile> =>
                call(agentCheckouts.browserProfiles.create({ body: input })),
            update: (id: string, input: AgentCheckoutBrowserProfileUpdate): Promise<AgentCheckoutBrowserProfile> =>
                call(agentCheckouts.browserProfiles.update({ path: { id }, body: input })),
            async delete(id: string): Promise<void> {
                await call(agentCheckouts.browserProfiles.delete({ path: { id } }));
            },
        },
    };
}

export type AgentCheckoutsApi = ReturnType<typeof createAgentCheckoutsApi>;

/**
 * The published client on the API client's base URL and headers (client key, buyer JWT, app id). The base
 * URL can be a key's environment or an `overrideBaseUrl` such as a backend proxy, so this rebuilds each
 * request URL from it instead of the spec's server.
 */
function createGeneratedClient(apiClient: CrossmintApiClient) {
    const client = createCrossmintClient({
        environment: apiClient.environment === "production" ? "production" : "staging",
        fetch: (request) => fetch(request),
    });
    const baseUrl = `${apiClient.baseUrl.replace(/\/$/, "")}/api`;
    client.interceptors.request.use((request, options) => {
        const routed = new Request(client.buildUrl({ ...options, baseUrl }), request);
        new Headers(apiClient.commonHeaders).forEach((value, name) => {
            if (!routed.headers.has(name)) {
                routed.headers.set(name, value);
            }
        });
        return routed;
    });
    return client;
}

function toStreamEvent(
    frame: { event?: string; id?: string } | undefined,
    data: unknown,
    path: string
): AgentCheckoutStreamEvent | undefined {
    const type = frame?.event;
    if (type !== "message.upsert" && type !== "run.updated") {
        return undefined;
    }
    if (frame?.id === undefined || frame.id === "") {
        throw new AgentCheckoutsApiError(`A ${type} event arrived without an id`, undefined, path);
    }
    if (typeof data !== "object" || data === null) {
        throw new AgentCheckoutsApiError(`A ${type} event carried non-JSON data`, undefined, path);
    }
    if (type === "message.upsert") {
        return { type, cursor: frame.id, message: data as AgentCheckoutMessage };
    }
    if (!isRunUpdate(data)) {
        throw new AgentCheckoutsApiError("Unexpected run update shape in the message stream", undefined, path, data);
    }
    return { type, cursor: frame.id, run: data };
}

function isRunUpdate(data: object): data is AgentCheckoutUpdate {
    return (
        "runId" in data &&
        typeof data.runId === "string" &&
        "status" in data &&
        typeof data.status === "string" &&
        AGENT_CHECKOUT_STATUSES.has(data.status)
    );
}

function streamPath(id: string): string {
    return `api/unstable/agent-checkouts/${encodeURIComponent(id)}/messages/stream`;
}

function networkError(path: string, cause: unknown): AgentCheckoutsApiError {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return new AgentCheckoutsApiError(
        `Could not reach the Crossmint API: ${reason}`,
        undefined,
        path,
        undefined,
        "network_error",
        cause
    );
}

/**
 * The response with every CRLF or CR turned into LF, holding a trailing CR until the next chunk so a CRLF split across
 * chunks stays one line ending. The generated SSE reader normalises chunk by chunk and would read it as two. Aborting
 * `signal` cancels the underlying body.
 */
function withLineFeeds(response: Response, signal: AbortSignal): Response {
    if (response.body === null) {
        return response;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let pending = "";
    const cancel = () => {
        reader.cancel().catch(() => undefined);
    };
    signal.addEventListener("abort", cancel, { once: true });
    const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
            const { done, value } = await reader.read();
            const text = pending + (done ? decoder.decode() : decoder.decode(value, { stream: true }));
            pending = !done && text.endsWith("\r") ? "\r" : "";
            const complete = pending === "" ? text : text.slice(0, -1);
            controller.enqueue(encoder.encode(complete.replace(/\r\n?/g, "\n")));
            if (done) {
                signal.removeEventListener("abort", cancel);
                controller.close();
            }
        },
        cancel,
    });
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

function toApiError(response: Response, path: string, body: unknown): AgentCheckoutsApiError {
    const message =
        typeof body === "object" && body !== null && "message" in body
            ? Array.isArray(body.message)
                ? body.message.join("; ")
                : String(body.message)
            : `${response.status} ${response.statusText}`;
    return new AgentCheckoutsApiError(message, response.status, path, typeof body === "string" ? undefined : body);
}

async function readBody(response: Response): Promise<unknown> {
    try {
        return await response.clone().json();
    } catch {
        return undefined;
    }
}

function pathOf(target: Request | Response | string | URL): string {
    const url = typeof target === "string" || target instanceof URL ? String(target) : target.url;
    return url === "" ? "" : new URL(url).pathname.replace(/^\//, "");
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        if (signal?.aborted) {
            resolve();
            return;
        }
        const timer = setTimeout(done, ms);
        function done() {
            clearTimeout(timer);
            signal?.removeEventListener("abort", done);
            resolve();
        }
        signal?.addEventListener("abort", done, { once: true });
    });
}
