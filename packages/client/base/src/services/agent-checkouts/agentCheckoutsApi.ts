import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import type { z } from "zod";

import { type Client, createClient } from "./gen/client";
import * as operations from "./gen/sdk.gen";
import type {
    AgentCheckoutBrowserProfileListResponseDto,
    AgentCheckoutBrowserProfileResponseDto,
    AgentCheckoutBuyerProfileListResponseDto,
    AgentCheckoutBuyerProfileResponseDto,
    AgentCheckoutCancellationAcceptedDto,
    AgentCheckoutListResponseDto,
    AgentCheckoutMessageAcceptedDto,
    AgentCheckoutMessageListResponseDto,
    AgentCheckoutResponseDto,
    AgentCheckoutStreamEventDto,
    CreateAgentCheckoutBrowserProfileDto,
    CreateAgentCheckoutBuyerProfileDto,
    CreateAgentCheckoutDto,
    ListCheckoutsData,
    SendAgentCheckoutMessageDto,
    UpdateAgentCheckoutBrowserProfileDto,
    UpdateAgentCheckoutBuyerProfileDto,
} from "./gen/types.gen";
import {
    zAgentCheckoutMessageListResponseDto,
    zAgentCheckoutStreamEventDto,
    zCancelCheckoutResponse,
    zCreateBrowserProfileResponse,
    zCreateBuyerProfileResponse,
    zCreateCheckoutResponse,
    zGetBrowserProfileResponse,
    zGetBuyerProfileResponse,
    zGetCheckoutResponse,
    zListBrowserProfilesResponse,
    zListBuyerProfilesResponse,
    zListCheckoutsResponse,
    zListMessagesResponse,
    zSendMessageResponse,
    zUpdateBrowserProfileResponse,
    zUpdateBuyerProfileResponse,
} from "./gen/zod.gen";

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(["succeeded", "blocked", "cancelled", "failed"]);
const DEFAULT_RECONNECT_DELAY_MS = 1_000;
const DEFAULT_MAX_EMPTY_RECONNECTS = 3;

// ---- Wire shapes, generated from the Crossmint API's OpenAPI spec (`pnpm generate`).

export type AgentCheckout = AgentCheckoutResponseDto;
export type AgentCheckoutStatus = AgentCheckout["status"];
export type AgentCheckoutPage = AgentCheckoutListResponseDto;
export type AgentCheckoutMessagePage = AgentCheckoutMessageListResponseDto;
export type AgentCheckoutMessage = AgentCheckoutMessagePage["data"][number];
export type AgentCheckoutUpdate = Exclude<AgentCheckoutStreamEventDto, AgentCheckoutMessage>;
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
export type SendAgentCheckoutMessageInput = SendAgentCheckoutMessageDto;
export type AgentCheckoutMessagePart = SendAgentCheckoutMessageInput["parts"][number];
export type AgentCheckoutInputResponse = Extract<AgentCheckoutMessagePart, { type: "input_response" }>;
export type AgentCheckoutProfilePage<T> = { data: T[]; nextCursor: string | null };
export type PageOptions = NonNullable<ListCheckoutsData["query"]>;

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

type Result<T> = { data?: T; error?: unknown; request?: Request; response?: Response };

/**
 * Agent checkouts: an AI agent buys on a merchant's site for the signed-in buyer. Every request
 * carries `x-api-key` and, when the API client has one, `Authorization: Bearer <jwt>`; the API
 * requires the client key's `agent-checkouts.*` scopes and a buyer JWT. Every failure surfaces as
 * `AgentCheckoutsApiError`.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export function createAgentCheckoutsApi({ apiClient }: AgentCheckoutsApiProps) {
    const client = createGeneratedClient(apiClient);

    async function call<T>(operation: Promise<Result<T>>, schema: z.ZodTypeAny): Promise<T> {
        const { data, error, request, response } = await operation;
        if (response === undefined) {
            throw error;
        }
        const path = pathOf(request ?? response);
        if (!response.ok) {
            throw toApiError(response, path, error);
        }
        if (!schema.safeParse(data).success) {
            throw new AgentCheckoutsApiError(`Unexpected response shape from ${path}`, response.status, path, data);
        }
        // Validated against the spec but returned as received, so fields newer than the spec reach callers.
        return data as T;
    }

    async function* streamMessages(
        id: string,
        options: StreamAgentCheckoutMessagesOptions = {}
    ): AsyncGenerator<AgentCheckoutStreamEvent> {
        const maxEmpty = options.maxEmptyReconnects ?? DEFAULT_MAX_EMPTY_RECONNECTS;
        let delayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
        let cursor = options.after;
        let emptyConnections = 0;
        let path = `api/unstable/agent-checkouts/${encodeURIComponent(id)}/messages/stream`;

        while (!options.signal?.aborted) {
            let delivered = false;
            let failure: AgentCheckoutsApiError | undefined;
            let frame: { event?: string; id?: string; retry?: number } | undefined;
            let complete = false;

            const { stream } = await operations.streamMessages({
                client,
                path: { id },
                ...(cursor === undefined ? {} : { query: { after: cursor } }),
                headers: { Accept: "text/event-stream", ...(cursor === undefined ? {} : { "last-event-id": cursor }) },
                cache: "no-store",
                ...(options.signal === undefined ? {} : { signal: options.signal }),
                // One connection per loop: reconnects, cursors and the empty-connection budget are ours.
                sseMaxRetryAttempts: 1,
                sseDefaultRetryDelay: delayMs,
                fetch: async (request) => {
                    path = pathOf(request);
                    const response = await globalThis.fetch(request);
                    if (!response.ok) {
                        failure = toApiError(response, path, await readBody(response));
                    }
                    return response;
                },
                onSseEvent: (event) => {
                    frame = event;
                    complete ||= event.event === "stream.complete";
                },
            });

            for await (const data of stream) {
                if (complete) {
                    return;
                }
                const event = toStreamEvent(frame, data, path);
                if (frame?.retry !== undefined) {
                    delayMs = frame.retry;
                }
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

            if (complete || options.signal?.aborted) {
                return;
            }
            const rejected: AgentCheckoutsApiError | undefined = failure;
            if (rejected?.status !== undefined && rejected.status < 500) {
                if (rejected.status === 409) {
                    throw new AgentCheckoutsApiError(rejected.message, 409, path, rejected.body, "resync_required");
                }
                throw rejected;
            }
            // Network failures, 5xx and dropped connections count against the same budget as empty connections.
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
            call(operations.createCheckout({ client, body: input }), zCreateCheckoutResponse),
        get: (id: string): Promise<AgentCheckout> =>
            call(operations.getCheckout({ client, path: { id } }), zGetCheckoutResponse),
        list: (options: PageOptions = {}): Promise<AgentCheckoutPage> =>
            call(operations.listCheckouts({ client, query: options }), zListCheckoutsResponse),
        cancel: (id: string): Promise<AcceptedAgentCheckoutCancel> =>
            call(operations.cancelCheckout({ client, path: { id } }), zCancelCheckoutResponse),
        listMessages: (id: string, options: PageOptions = {}): Promise<AgentCheckoutMessagePage> =>
            call(operations.listMessages({ client, path: { id }, query: options }), zListMessagesResponse),
        sendMessage: (id: string, message: SendAgentCheckoutMessageInput): Promise<AcceptedAgentCheckoutMessage> =>
            call(operations.sendMessage({ client, path: { id }, body: message }), zSendMessageResponse),
        streamMessages,
        buyerProfiles: {
            list: (options: PageOptions = {}): Promise<AgentCheckoutBuyerProfilePage> =>
                call(operations.listBuyerProfiles({ client, query: options }), zListBuyerProfilesResponse),
            get: (id: string): Promise<AgentCheckoutBuyerProfile> =>
                call(operations.getBuyerProfile({ client, path: { id } }), zGetBuyerProfileResponse),
            create: (input: AgentCheckoutBuyerProfileInput): Promise<AgentCheckoutBuyerProfile> =>
                call(operations.createBuyerProfile({ client, body: input }), zCreateBuyerProfileResponse),
            update: (id: string, input: AgentCheckoutBuyerProfileUpdate): Promise<AgentCheckoutBuyerProfile> =>
                call(operations.updateBuyerProfile({ client, path: { id }, body: input }), zUpdateBuyerProfileResponse),
            async delete(id: string): Promise<void> {
                await call(operations.deleteBuyerProfile({ client, path: { id } }), anything);
            },
        },
        browserProfiles: {
            list: (options: PageOptions = {}): Promise<AgentCheckoutBrowserProfilePage> =>
                call(operations.listBrowserProfiles({ client, query: options }), zListBrowserProfilesResponse),
            get: (id: string): Promise<AgentCheckoutBrowserProfile> =>
                call(operations.getBrowserProfile({ client, path: { id } }), zGetBrowserProfileResponse),
            create: (input: AgentCheckoutBrowserProfileInput = {}): Promise<AgentCheckoutBrowserProfile> =>
                call(operations.createBrowserProfile({ client, body: input }), zCreateBrowserProfileResponse),
            update: (id: string, input: AgentCheckoutBrowserProfileUpdate): Promise<AgentCheckoutBrowserProfile> =>
                call(
                    operations.updateBrowserProfile({ client, path: { id }, body: input }),
                    zUpdateBrowserProfileResponse
                ),
            async delete(id: string): Promise<void> {
                await call(operations.deleteBrowserProfile({ client, path: { id } }), anything);
            },
        },
    };
}

export type AgentCheckoutsApi = ReturnType<typeof createAgentCheckoutsApi>;

const anything = { safeParse: () => ({ success: true }) } as unknown as z.ZodTypeAny;
const zMessage = zAgentCheckoutMessageListResponseDto.shape.data.element;

/** The generated operations on the API client's base URL and headers (client key, buyer JWT, app id). */
function createGeneratedClient(apiClient: CrossmintApiClient): Client {
    const client = createClient({ baseUrl: apiClient.baseUrl.replace(/\/$/, ""), fetch: (request) => fetch(request) });
    client.interceptors.request.use((request) => {
        new Headers(apiClient.commonHeaders).forEach((value, name) => {
            if (!request.headers.has(name)) {
                request.headers.set(name, value);
            }
        });
        return request;
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
        if (!zMessage.safeParse(data).success) {
            throw new AgentCheckoutsApiError("Unexpected message shape in the message stream", undefined, path, data);
        }
        return { type, cursor: frame.id, message: data as AgentCheckoutMessage };
    }
    if (!("runId" in data) || !zAgentCheckoutStreamEventDto.safeParse(data).success) {
        throw new AgentCheckoutsApiError("Unexpected run update shape in the message stream", undefined, path, data);
    }
    return { type, cursor: frame.id, run: data as AgentCheckoutUpdate };
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
