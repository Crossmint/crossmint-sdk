import type { z } from "zod";

import { generateRandomString } from "./utils/generateRandomString";

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
    private listeners: Map<string, (message: MessageEvent) => void> = new Map();

    constructor(
        public otherWindow: Window,
        public targetOrigin: string | string[],
        public incomingEvents: IncomingEvents,
        public outgoingEvents: OutgoingEvents
    ) {
        this.otherWindow = otherWindow;
        this.targetOrigin = targetOrigin;
    }

    send<K extends keyof OutgoingEvents>(event: K, data: z.infer<OutgoingEvents[K]>) {
        const result = this.outgoingEvents[event].safeParse(data);
        if (result.success) {
            if (Array.isArray(this.targetOrigin)) {
                this.targetOrigin.forEach((origin) => {
                    this.otherWindow?.postMessage({ event, data }, origin);
                });
            } else {
                this.otherWindow?.postMessage({ event, data }, this.targetOrigin);
            }
        } else {
            console.error("Invalid data for event", event, result.error);
        }
    }

    on<K extends keyof IncomingEvents>(event: K, callback: (data: z.infer<IncomingEvents[K]>) => void): string {
        const listener = (message: MessageEvent) => {
            if (message.data.event === event && this.isTargetOrigin(message.origin)) {
                const data = this.incomingEvents[event].safeParse(message.data.data);
                if (data.success) {
                    callback(data.data);
                } else {
                    console.error("Invalid data for event", event, data.error);
                }
            }
        };

        const id = generateRandomString();
        this.listeners.set(id, listener);
        window.addEventListener("message", listener);
        return id;
    }

    sendAction<K extends keyof OutgoingEvents, R extends keyof IncomingEvents>({
        event,
        data,
        responseEvent,
        options,
    }: SendActionArgs<IncomingEvents, OutgoingEvents, K, R>): Promise<z.infer<IncomingEvents[R]>> {
        const timeoutMs = options?.timeoutMs ?? 7000;

        return new Promise((resolve, reject) => {
            let interval: NodeJS.Timeout | undefined = undefined;
            const timer = setTimeout(() => {
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
        const listener = this.listeners.get(id);
        if (listener) {
            window.removeEventListener("message", listener);
            this.listeners.delete(id);
        }
    }

    protected isTargetOrigin(otherOrigin: string) {
        if (Array.isArray(this.targetOrigin)) {
            return this.targetOrigin.includes(otherOrigin);
        }

        if (this.targetOrigin === "*") {
            return true;
        }
        return this.targetOrigin === otherOrigin;
    }
}
