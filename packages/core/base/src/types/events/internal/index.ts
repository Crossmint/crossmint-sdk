import { CrossmintInternalEvents } from "./events";
import { CrossmintInternalEventMap } from "./payloads";

export * from "./events";
export * from "./payloads";

export interface CrossmintInternalEvent<K extends CrossmintInternalEvents = CrossmintInternalEvents> {
    type: K;
    payload: CrossmintInternalEventMap[K];
}

export type CrossmintInternalEventUnion = {
    [K in CrossmintInternalEvents]: CrossmintInternalEvent<K>;
}[CrossmintInternalEvents];
