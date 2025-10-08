import type { z } from "zod";
import type { SimpleMessageEvent, Transport } from "./transport/Transport";

export type EventMap = Record<string, z.ZodTypeAny>;

export interface EventEmitterOptions<
    IncomingEvents extends EventMap = EventMap,
    OutgoingEvents extends EventMap = EventMap,
> {
    incomingEvents?: IncomingEvents;
    outgoingEvents?: OutgoingEvents;
}

export interface SendActionOptions<IncomingEvents extends EventMap, R extends keyof IncomingEvents> {
    timeoutMs?: number;
    intervalMs?: number;
    maxRetries?: number;
    condition?: (data: z.infer<IncomingEvents[R]>) => boolean;
}
export type SendActionArgs<
    IncomingEvents extends EventMap,
    OutgoingEvents extends EventMap,
    K extends keyof OutgoingEvents,
    R extends keyof IncomingEvents,
> = {
    event: K;
    data: z.infer<OutgoingEvents[K]>;
    responseEvent: R;
    options?: SendActionOptions<IncomingEvents, R>;
};

export interface OnActionOptions<OutgoingEvents extends EventMap, R extends keyof OutgoingEvents> {
    timeoutMs?: number;
    condition?: (data: z.infer<OutgoingEvents[R]>) => boolean;
}
export type OnActionArgs<
    IncomingEvents extends EventMap,
    OutgoingEvents extends EventMap,
    K extends keyof IncomingEvents,
    R extends keyof OutgoingEvents,
> =
    | {
          event: K;
          responseEvent: R;
          callback: (data: z.infer<IncomingEvents[K]>) => z.infer<OutgoingEvents[R]>;
          options?: OnActionOptions<OutgoingEvents, R>;
      }
    | {
          event: K;
          options?: OnActionOptions<OutgoingEvents, R>;
      };

export class EventEmitter<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> {
    protected transport: Transport<OutgoingEvents>;
    public incomingEvents: IncomingEvents;
    public outgoingEvents: OutgoingEvents;

    constructor(transport: Transport<OutgoingEvents>, incomingEvents: IncomingEvents, outgoingEvents: OutgoingEvents) {
        this.transport = transport;
        this.incomingEvents = incomingEvents;
        this.outgoingEvents = outgoingEvents;
    }

    send<K extends keyof OutgoingEvents>(event: K, data: z.infer<OutgoingEvents[K]>) {
        console.log("[EventEmitter] send() - Data to send:", data);

        const result = this.outgoingEvents[event].safeParse(data);
        if (result.success) {
            console.log(`[EventEmitter] send() - Data validation successful for event: ${String(event)}`);
            this.transport.send({ event, data });
            console.log(`[EventEmitter] send() - Successfully sent event: ${String(event)} via transport`);
        } else {
            console.error("Invalid data for event", event, result.error);
        }
    }

    on<K extends keyof IncomingEvents>(event: K, callback: (data: z.infer<IncomingEvents[K]>) => void): string {
        console.log(`[EventEmitter] on() called - Registering listener for event: ${String(event)}`);

        const listener = (message: SimpleMessageEvent) => {
            console.log(`[EventEmitter] on() - Received message for event: ${String(message.data.event)}`);

            if (message.data.event === event) {
                console.log("[EventEmitter] on() - Raw message data:", message.data.data);

                const data = this.incomingEvents[event].safeParse(message.data.data);
                if (data.success) {
                    console.log("[EventEmitter] on() - Calling callback with validated data:", data.data);
                    callback(data.data);
                    console.log(`[EventEmitter] on() - Callback completed for event: ${String(event)}`);
                } else {
                    console.error("[EventEmitter] on() - Validation error:", data.error);
                }
            }
        };

        const listenerId = this.transport.addMessageListener(listener);
        console.log(`[EventEmitter] on() - Listener registered with ID: ${listenerId} for event: ${String(event)}`);

        return listenerId;
    }

    sendAction<K extends keyof OutgoingEvents, R extends keyof IncomingEvents>({
        event,
        data,
        responseEvent,
        options,
    }: SendActionArgs<IncomingEvents, OutgoingEvents, K, R>): Promise<z.infer<IncomingEvents[R]>> {
        console.log("[EventEmitter] sendAction() - Data to send:", data);
        const timeoutMs = options?.timeoutMs ?? 7000;
        const maxRetries = options?.maxRetries;

        return new Promise((resolve, reject) => {
            let interval: ReturnType<typeof setInterval> | undefined = undefined;
            let retryCount = 0;

            const timer = setTimeout(() => {
                console.log(
                    `[EventEmitter] sendAction() - Timeout reached for response event: ${String(responseEvent)}`
                );
                if (interval) {
                    clearInterval(interval);
                }
                this.off(responseListenerId);
                reject(
                    `Timed out waiting for ${String(responseEvent)} event${
                        options?.condition ? ", with condition," : ""
                    } after ${timeoutMs / 1000}s`
                );
            }, timeoutMs);

            const responseListenerId = this.on(responseEvent, (responseData) => {
                console.log("[EventEmitter] sendAction() - Response data:", responseData);

                if (options?.condition && !options.condition(responseData)) {
                    console.log(
                        `[EventEmitter] sendAction() - Condition not met for response event: ${String(responseEvent)}`
                    );
                    return;
                }

                console.log(
                    `[EventEmitter] sendAction() - Condition satisfied for response event: ${String(responseEvent)}`
                );

                if (interval) {
                    clearInterval(interval);
                }

                console.log("[EventEmitter] sendAction() - Clearing timeout and removing listener");
                clearTimeout(timer);
                this.off(responseListenerId);

                console.log(
                    `[EventEmitter] sendAction() - Resolving promise with data for event: ${String(responseEvent)}`
                );
                resolve(responseData);
            });

            console.log(`[EventEmitter] sendAction() - Sending initial event: ${String(event)}`);
            this.send(event, data);

            if (options?.intervalMs) {
                console.log(`[EventEmitter] sendAction() - Setting up interval with intervalMs: ${options.intervalMs}`);
                interval = setInterval(() => {
                    if (maxRetries !== undefined && retryCount >= maxRetries) {
                        console.log(
                            `[EventEmitter] sendAction() - Max retries (${maxRetries}) reached for event: ${String(event)}`
                        );
                        clearInterval(interval!);
                        clearTimeout(timer);
                        this.off(responseListenerId);
                        reject(
                            `Max retries (${maxRetries}) reached waiting for ${String(responseEvent)} event${
                                options?.condition ? ", with condition" : ""
                            }`
                        );
                        return;
                    }

                    retryCount++;
                    console.log(
                        `[EventEmitter] sendAction() - Retry attempt ${retryCount}/${maxRetries ?? "∞"} for event: ${String(event)}`
                    );
                    this.send(event, data);
                }, options?.intervalMs);
            }

            console.log(
                `[EventEmitter] sendAction() - Action initiated, waiting for response: ${String(responseEvent)}`
            );
        });
    }

    async onAction<K extends keyof IncomingEvents, R extends keyof OutgoingEvents>({
        event,
        options,
        ...params
    }: OnActionArgs<IncomingEvents, OutgoingEvents, K, R>): Promise<z.infer<IncomingEvents[K]>> {
        console.log(`[EventEmitter] onAction() called - Event: ${String(event)}`);

        const timeoutMs = options?.timeoutMs ?? 7000;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                console.log(`[EventEmitter] onAction() - Timeout reached for event: ${String(event)}`);
                reject(
                    `Timed out waiting for ${String(event)} event${
                        options?.condition ? ", with condition," : ""
                    } after ${timeoutMs / 1000}s`
                );
            }, timeoutMs);

            const responseListenerId = this.on(event, (data) => {
                console.log("[EventEmitter] onAction() - Received data:", data);

                if (options?.condition && !options.condition(data)) {
                    console.log(`[EventEmitter] onAction() - Condition not met for event: ${String(event)}`);
                    return;
                }

                console.log(`[EventEmitter] onAction() - Condition satisfied for event: ${String(event)}`);

                if ("callback" in params && params.callback != null) {
                    console.log(`[EventEmitter] onAction() - Executing callback for event: ${String(event)}`);
                    const result = params.callback(data);
                    console.log("[EventEmitter] onAction() - Callback result:", result);
                    this.send(params.responseEvent, result);
                }

                console.log(
                    `[EventEmitter] onAction() - Removing listener and clearing timeout for event: ${String(event)}`
                );
                this.off(responseListenerId);
                clearTimeout(timer);

                console.log(`[EventEmitter] onAction() - Resolving promise with data for event: ${String(event)}`);
                resolve(data);
            });

            console.log(`[EventEmitter] onAction() - Action listener registered, waiting for event: ${String(event)}`);
        });
    }

    off(id: string) {
        this.transport.removeMessageListener(id);
    }
}
