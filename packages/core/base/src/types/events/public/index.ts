import { CrossmintPublicEvents } from "./events";
import { CrossmintPublicEventMap } from "./payloads";

export * from "./events";
export * from "./payloads";

export interface CrossmintPublicEvent<K extends CrossmintPublicEvents = CrossmintPublicEvents> {
    type: K;
    payload: CrossmintPublicEventMap[K];
}

export type CrossmintPublicEventUnion = {
    [K in CrossmintPublicEvents]: CrossmintPublicEvent<K>;
}[CrossmintPublicEvents];
