import { IncomingInternalEvents, OutgoingInternalEvents } from "./events";
import { CrossmintInternalEventMap } from "./payloads";

export * from "./events";
export * from "./payloads";

export type IncomingInternalEvent = {
    [K in IncomingInternalEvents]: {
        type: K;
        payload: CrossmintInternalEventMap[K];
    };
}[IncomingInternalEvents];

export type OutgoingInternalEvent = {
    [K in OutgoingInternalEvents]: {
        type: K;
        payload: CrossmintInternalEventMap[K];
    };
}[OutgoingInternalEvents];

export type CrossmintInternalEvent = IncomingInternalEvent | OutgoingInternalEvent;
