import { CrossmintEvents } from "./events";
import { CrossmintEventMap } from "./payloads";

export * from "./events";
export * from "./payloads";

export interface CrossmintEvent<K extends CrossmintEvents = CrossmintEvents> {
    type: K;
    payload: CrossmintEventMap[K];
}

export type CrossmintEventUnion = {
    [K in CrossmintEvents]: CrossmintEvent<K>;
}[CrossmintEvents];
