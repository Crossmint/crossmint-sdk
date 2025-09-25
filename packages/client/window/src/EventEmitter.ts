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
        const result = this.outgoingEvents[event].safeParse(data);
        if (result.success) {
            this.transport.send({ event, data });
        } else {
            console.error("Invalid data for event", event, result.error);
        }
    }

    on<K extends keyof IncomingEvents>(event: K, callback: (data: z.infer<IncomingEvents[K]>) => void): string {
        const listener = (message: SimpleMessageEvent) => {
            if (message.data.event === event) {
                const data = this.incomingEvents[event].safeParse(message.data.data);
                if (data.success) {
                    callback(data.data);
                } else {
                    console.error("Invalid data for event", event, data.error);
                }
            }
        };

        return this.transport.addMessageListener(listener);
    }

    sendAction<K extends keyof OutgoingEvents, R extends keyof IncomingEvents>({
        event,
        data,
        responseEvent,
        options,
    }: SendActionArgs<IncomingEvents, OutgoingEvents, K, R>): Promise<z.infer<IncomingEvents[R]>> {
        const timeoutMs = options?.timeoutMs ?? 7000;

        return new Promise((resolve, reject) => {
            let interval: ReturnType<typeof setInterval> | undefined = undefined;
            const timer = setTimeout(() => {
                this.off(responseListenerId);
                reject(
                    `Timed out waiting for ${String(responseEvent)} event${
                        options?.condition ? ", with condition," : ""
                    } after ${timeoutMs / 1000}s`
                );
            }, timeoutMs);

            const responseListenerId = this.on(responseEvent, (data) => {
                if (options?.condition && !options.condition(data)) {
                    return;
                }

                if (interval) {
                    clearInterval(interval);
                }
                clearTimeout(timer);
                this.off(responseListenerId);
                resolve(data);
            });

            this.send(event, data);
            if (options?.intervalMs) {
                interval = setInterval(() => this.send(event, data), options?.intervalMs);
            }
        });
    }

    async onAction<K extends keyof IncomingEvents, R extends keyof OutgoingEvents>({
        event,
        options,
        ...params
    }: OnActionArgs<IncomingEvents, OutgoingEvents, K, R>): Promise<z.infer<IncomingEvents[K]>> {
        const timeoutMs = options?.timeoutMs ?? 7000;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(
                    `Timed out waiting for ${String(event)} event${
                        options?.condition ? ", with condition," : ""
                    } after ${timeoutMs / 1000}s`
                );
            }, timeoutMs);

            const responseListenerId = this.on(event, (data) => {
                if (options?.condition && !options.condition(data)) {
                    return;
                }

                if ("callback" in params && params.callback != null) {
                    const result = params.callback(data);
                    this.send(params.responseEvent, result);
                }

                this.off(responseListenerId);
                clearTimeout(timer);
                resolve(data);
            });
        });
    }

    off(id: string) {
        this.transport.removeMessageListener(id);
    }
}
