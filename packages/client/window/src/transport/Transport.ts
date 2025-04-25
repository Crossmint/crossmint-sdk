import type { z } from "zod";
import type { EventMap } from "../EventEmitter";

export type SimpleMessageEvent = {
    type: string;
    data: {
        event: string;
        data: object;
    };
};

export interface Transport<OutgoingEvents extends EventMap = EventMap> {
    send<K extends keyof OutgoingEvents>(message: { event: K; data: z.infer<OutgoingEvents[K]> }): void;
    addMessageListener(listener: (event: SimpleMessageEvent | MessageEvent) => void): string;
    removeMessageListener(id: string): void;
}
