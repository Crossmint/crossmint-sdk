import { ApiClientError, type CrossmintApiClient } from "@crossmint/common-sdk-base";
import { z } from "zod";

const BASE_PATH = "api/unstable/agent-checkouts";
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(["succeeded", "blocked", "cancelled", "failed"]);
const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_EMPTY_RECONNECTS = 3;

// ---- Wire shapes. Universal Checkout owns the full contract; the SDK checks the fields it
// relies on and passes everything else through unchanged, so new run fields reach callers.

export type AgentCheckoutStatus =
    | "queued"
    | "running"
    | "awaiting_input"
    | "succeeded"
    | "blocked"
    | "cancelled"
    | "failed";

const checkoutSchema = z
    .object({ runId: z.string(), status: z.string(), revision: z.number(), createdAt: z.string() })
    .passthrough();
/** `status` is one of `AgentCheckoutStatus`; it stays a string so a new status does not fail parsing. */
export type AgentCheckout = z.infer<typeof checkoutSchema>;

const checkoutUpdateSchema = z.object({ runId: z.string(), status: z.string(), revision: z.number() }).passthrough();
export type AgentCheckoutUpdate = z.infer<typeof checkoutUpdateSchema>;

const checkoutPageSchema = z.object({ data: z.array(checkoutSchema), nextCursor: z.string().nullable() });
export type AgentCheckoutPage = { data: AgentCheckout[]; nextCursor: string | null };

const messageSchema = z
    .object({
        id: z.string(),
        revision: z.number(),
        role: z.enum(["user", "assistant"]),
        createdAt: z.string(),
        parts: z.array(z.object({ type: z.string() }).passthrough()),
    })
    .passthrough();
export type AgentCheckoutMessage = z.infer<typeof messageSchema>;

const messagePageSchema = z.object({
    data: z.array(messageSchema),
    nextCursor: z.string().nullable(),
    streamCursor: z.string(),
});
export type AgentCheckoutMessagePage = z.infer<typeof messagePageSchema>;

const acceptedMessageSchema = z.object({ status: z.literal("accepted"), messageId: z.string() });
export type AcceptedAgentCheckoutMessage = z.infer<typeof acceptedMessageSchema>;

const acceptedCancelSchema = z.object({ runId: z.string(), status: z.literal("accepted") });
export type AcceptedAgentCheckoutCancel = z.infer<typeof acceptedCancelSchema>;

const buyerProfileSchema = z
    .object({
        id: z.string(),
        shipping: z
            .object({ addressLines: z.array(z.string()), locality: z.string(), countryCode: z.string() })
            .passthrough(),
        createdAt: z.string(),
        updatedAt: z.string(),
    })
    .passthrough();
export type AgentCheckoutBuyerProfile = z.infer<typeof buyerProfileSchema>;

const browserProfileSchema = z.object({ id: z.string(), createdAt: z.string(), updatedAt: z.string() }).passthrough();
export type AgentCheckoutBrowserProfile = z.infer<typeof browserProfileSchema>;

function pageSchema<T extends z.ZodTypeAny>(item: T) {
    return z.object({ data: z.array(item), nextCursor: z.string().nullable() });
}
const buyerProfilePageSchema = pageSchema(buyerProfileSchema);
const browserProfilePageSchema = pageSchema(browserProfileSchema);
export type AgentCheckoutProfilePage<T> = { data: T[]; nextCursor: string | null };

export interface CreateAgentCheckoutInput {
    request: { startUrl: string; task?: string };
    constraints: { maxCost: { amount: string; currency: string } };
    buyerProfileId?: string;
    merchantGuidance?: string;
    browser?: AgentCheckoutBrowserRequest;
}

/**
 * A browser you run, controlled through the Chrome DevTools Protocol. Universal Checkout connects
 * to it and disconnects when done; it never launches or closes it. In production the URL must be
 * a `wss://` URL to a public host. The URL and headers are treated as secrets: the API never
 * returns them, and a run's input shows only `{ redacted: true }`.
 */
export interface AgentCheckoutCdpBrowser {
    url: string;
    /** Sent when connecting, for example a browser provider's credentials. */
    headers?: Record<string, string>;
}

/** A Crossmint-run browser (`profileId`, `location`) or your own browser (`cdp`); the API refuses both. */
export interface AgentCheckoutBrowserRequest {
    profileId?: string;
    location?: { type: "country"; countryCode: string };
    cdp?: AgentCheckoutCdpBrowser;
}

export type AgentCheckoutInputResponse =
    | { kind: "form"; values: Record<string, string | number | boolean | string[]> }
    | { kind: "payment"; orderIntentId: string }
    | { kind: "protected"; protectedInputId: string };

export type AgentCheckoutMessagePart =
    | { type: "text"; text: string }
    | { type: "input_response"; requestId: string; action: "submit"; response: AgentCheckoutInputResponse }
    | { type: "input_response"; requestId: string; action: "alternative"; text: string }
    | { type: "input_response"; requestId: string; action: "decline" };

export interface SendAgentCheckoutMessageInput {
    /** Caller-chosen idempotency id; resending the same id does not add a second message. */
    id: string;
    parts: [AgentCheckoutMessagePart];
}

export interface AgentCheckoutBuyerProfileInput {
    label?: string;
    name?: { first?: string; last?: string };
    contact?: { email?: string; phone?: string };
    shipping: {
        addressLines: string[];
        locality: string;
        administrativeAreaCode?: string | null;
        postalCode?: string | null;
        countryCode: string;
    };
}
export type AgentCheckoutBuyerProfileUpdate = Partial<Omit<AgentCheckoutBuyerProfileInput, "shipping">> & {
    shipping?: Partial<AgentCheckoutBuyerProfileInput["shipping"]>;
};

export type PageOptions = {
    cursor?: string;
    limit?: number;
};

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

export type AgentCheckoutsApiErrorCode = "resync_required";

export class AgentCheckoutsApiError extends Error {
    constructor(
        message: string,
        public readonly status: number | undefined,
        public readonly path: string,
        /** The parsed error body, when the API sent JSON. */
        public readonly body?: unknown,
        public readonly code?: AgentCheckoutsApiErrorCode
    ) {
        super(message);
        this.name = "AgentCheckoutsApiError";
    }
}

export type AgentCheckoutsApiProps = {
    apiClient: CrossmintApiClient;
};

const errorBodySchema = z.object({ message: z.union([z.string(), z.array(z.string())]) }).passthrough();

/**
 * Agent checkouts: an AI agent buys on a merchant's site for the signed-in buyer. Every request
 * carries `x-api-key` and, when the API client has one, `Authorization: Bearer <jwt>`; the API
 * requires the client key's `agent-checkouts.*` scopes and a buyer JWT. Every failure surfaces as
 * `AgentCheckoutsApiError`.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export function createAgentCheckoutsApi({ apiClient }: AgentCheckoutsApiProps) {
    async function send(path: string, request: () => Promise<Response>): Promise<Response> {
        let response: Response;
        try {
            response = await request();
        } catch (error) {
            if (error instanceof ApiClientError) {
                throw new AgentCheckoutsApiError(error.message, error.status, path, error.responseBody);
            }
            throw error;
        }
        if (!response.ok) {
            throw await toApiError(response, path);
        }
        return response;
    }

    async function parse<T>(response: Response, path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
        let body: unknown;
        try {
            body = await response.json();
        } catch {
            throw new AgentCheckoutsApiError(`Unexpected non-JSON response from ${path}`, response.status, path);
        }
        const result = schema.safeParse(body);
        if (!result.success) {
            throw new AgentCheckoutsApiError(`Unexpected response shape from ${path}`, response.status, path, body);
        }
        return result.data;
    }

    async function getJson<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
        return parse(await send(path, () => apiClient.get(path, {})), path, schema);
    }

    async function sendJson<T>(
        method: "post" | "patch",
        path: string,
        body: unknown,
        schema: z.ZodType<T, z.ZodTypeDef, unknown>
    ): Promise<T> {
        const init = { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) };
        const response = await send(path, () =>
            method === "post" ? apiClient.post(path, init) : apiClient.patch(path, init)
        );
        return parse(response, path, schema);
    }

    function profiles<T, CreateInput, UpdateInput>(
        segment: "buyer-profiles" | "browser-profiles",
        item: z.ZodType<T, z.ZodTypeDef, unknown>,
        page: z.ZodType<AgentCheckoutProfilePage<T>, z.ZodTypeDef, unknown>
    ) {
        const root = `${BASE_PATH}/${segment}`;
        return {
            list: (options: PageOptions = {}) => getJson(withQuery(root, options), page),
            get: (id: string) => getJson(`${root}/${encodeURIComponent(id)}`, item),
            create: (input: CreateInput) => sendJson("post", root, input, item),
            update: (id: string, input: UpdateInput) =>
                sendJson("patch", `${root}/${encodeURIComponent(id)}`, input, item),
            async delete(id: string): Promise<void> {
                const path = `${root}/${encodeURIComponent(id)}`;
                await send(path, () => apiClient.delete(path, {}));
            },
        };
    }

    function checkoutPath(id: string, suffix = "") {
        return `${BASE_PATH}/${encodeURIComponent(id)}${suffix}`;
    }

    async function* streamMessages(
        id: string,
        options: StreamAgentCheckoutMessagesOptions = {}
    ): AsyncGenerator<AgentCheckoutStreamEvent> {
        const path = checkoutPath(id, "/messages/stream");
        const maxEmpty = options.maxEmptyReconnects ?? DEFAULT_MAX_EMPTY_RECONNECTS;
        let delayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
        let cursor = options.after;
        let emptyConnections = 0;

        while (!options.signal?.aborted) {
            const url = withQuery(path, cursor === undefined ? {} : { after: cursor });
            let delivered = false;
            let response: Response | undefined;
            try {
                response = await send(path, () =>
                    apiClient.get(url, {
                        headers: {
                            Accept: "text/event-stream",
                            ...(cursor === undefined ? {} : { "Last-Event-ID": cursor }),
                        },
                        cache: "no-store",
                        ...(options.signal === undefined ? {} : { signal: options.signal }),
                    })
                );
            } catch (error) {
                if (options.signal?.aborted) {
                    return;
                }
                if (error instanceof AgentCheckoutsApiError && error.status !== undefined && error.status < 500) {
                    if (error.status === 409) {
                        throw new AgentCheckoutsApiError(error.message, 409, path, error.body, "resync_required");
                    }
                    throw error;
                }
                // Network failures and 5xx count against the same budget as empty connections.
            }

            if (response !== undefined) {
                if (response.body == null) {
                    throw new AgentCheckoutsApiError("The message stream returned no body", response.status, path);
                }
                try {
                    for await (const frame of readSseFrames(response.body, options.signal)) {
                        if (frame.retry !== undefined) {
                            delayMs = frame.retry;
                        }
                        if (frame.event === "stream.complete") {
                            return;
                        }
                        const event = parseStreamEvent(frame, path);
                        if (event === undefined) {
                            continue;
                        }
                        delivered = true;
                        cursor = event.cursor;
                        yield event;
                        if (event.type === "run.updated" && TERMINAL_STATUSES.has(event.run.status)) {
                            return;
                        }
                    }
                } catch (error) {
                    if (options.signal?.aborted) {
                        return;
                    }
                    if (error instanceof AgentCheckoutsApiError) {
                        throw error;
                    }
                    // A dropped connection reconnects from the last cursor.
                }
            }

            emptyConnections = delivered ? 0 : emptyConnections + 1;
            if (emptyConnections > maxEmpty) {
                throw new AgentCheckoutsApiError(
                    "The message stream keeps closing without events; re-read the conversation and resubscribe from its streamCursor",
                    undefined,
                    path,
                    undefined,
                    "resync_required"
                );
            }
            await sleep(delayMs, options.signal);
        }
    }

    return {
        create: (input: CreateAgentCheckoutInput): Promise<AgentCheckout> =>
            sendJson("post", BASE_PATH, input, checkoutSchema),
        get: (id: string): Promise<AgentCheckout> => getJson(checkoutPath(id), checkoutSchema),
        list: (options: PageOptions = {}): Promise<AgentCheckoutPage> =>
            getJson(withQuery(BASE_PATH, options), checkoutPageSchema),
        cancel: (id: string): Promise<AcceptedAgentCheckoutCancel> =>
            sendJson("post", checkoutPath(id, "/cancel"), {}, acceptedCancelSchema),
        listMessages: (id: string, options: PageOptions = {}): Promise<AgentCheckoutMessagePage> =>
            getJson(withQuery(checkoutPath(id, "/messages"), options), messagePageSchema),
        sendMessage: (id: string, message: SendAgentCheckoutMessageInput): Promise<AcceptedAgentCheckoutMessage> =>
            sendJson("post", checkoutPath(id, "/messages"), message, acceptedMessageSchema),
        streamMessages,
        buyerProfiles: profiles<
            AgentCheckoutBuyerProfile,
            AgentCheckoutBuyerProfileInput,
            AgentCheckoutBuyerProfileUpdate
        >("buyer-profiles", buyerProfileSchema, buyerProfilePageSchema),
        browserProfiles: profiles<AgentCheckoutBrowserProfile, { label?: string }, { label: string }>(
            "browser-profiles",
            browserProfileSchema,
            browserProfilePageSchema
        ),
    };
}

export type AgentCheckoutsApi = ReturnType<typeof createAgentCheckoutsApi>;

async function toApiError(response: Response, path: string): Promise<AgentCheckoutsApiError> {
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        body = undefined;
    }
    const parsed = errorBodySchema.safeParse(body);
    const message = parsed.success
        ? Array.isArray(parsed.data.message)
            ? parsed.data.message.join("; ")
            : parsed.data.message
        : `${response.status} ${response.statusText}`;
    return new AgentCheckoutsApiError(message, response.status, path, body);
}

function withQuery(path: string, query: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
            params.set(key, String(value));
        }
    }
    const search = params.toString();
    return search === "" ? path : `${path}?${search}`;
}

type SseFrame = { event?: string; id?: string; data?: string; retry?: number };

async function* readSseFrames(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<SseFrame> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const onAbort = () => void reader.cancel().catch(() => undefined);
    signal?.addEventListener("abort", onAbort, { once: true });
    let buffer = "";
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) {
                return;
            }
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, "\n");
            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
                const frame = parseSseFrame(buffer.slice(0, boundary));
                buffer = buffer.slice(boundary + 2);
                if (frame !== undefined) {
                    yield frame;
                }
                boundary = buffer.indexOf("\n\n");
            }
        }
    } finally {
        signal?.removeEventListener("abort", onAbort);
        reader.releaseLock();
    }
}

function parseSseFrame(block: string): SseFrame | undefined {
    const frame: SseFrame = {};
    const data: string[] = [];
    for (const line of block.split("\n")) {
        if (line === "" || line.startsWith(":")) {
            continue;
        }
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "data") {
            data.push(value);
        } else if (field === "event") {
            frame.event = value;
        } else if (field === "id") {
            frame.id = value;
        } else if (field === "retry" && /^\d+$/.test(value)) {
            frame.retry = Number(value);
        }
    }
    if (data.length > 0) {
        frame.data = data.join("\n");
    }
    return frame.event === undefined && frame.data === undefined ? undefined : frame;
}

function parseStreamEvent(frame: SseFrame, path: string): AgentCheckoutStreamEvent | undefined {
    if (frame.event !== "message.upsert" && frame.event !== "run.updated") {
        return undefined;
    }
    if (frame.id === undefined || frame.data === undefined) {
        throw new AgentCheckoutsApiError(`A ${frame.event} event arrived without an id or data`, undefined, path);
    }
    let data: unknown;
    try {
        data = JSON.parse(frame.data);
    } catch {
        throw new AgentCheckoutsApiError(`A ${frame.event} event carried non-JSON data`, undefined, path);
    }
    if (frame.event === "message.upsert") {
        const message = messageSchema.safeParse(data);
        if (!message.success) {
            throw new AgentCheckoutsApiError("Unexpected message shape in the message stream", undefined, path, data);
        }
        return { type: "message.upsert", cursor: frame.id, message: message.data };
    }
    const run = checkoutUpdateSchema.safeParse(data);
    if (!run.success) {
        throw new AgentCheckoutsApiError("Unexpected run update shape in the message stream", undefined, path, data);
    }
    return { type: "run.updated", cursor: frame.id, run: run.data };
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
