import { CrossmintEvents } from "./events";
import { CrossmintEventMap } from "./payloads";

export * from "./events";
export * from "./payloads";

export type CrossmintEvent = {
    [K in CrossmintEvents]: {
        type: K;
        payload: CrossmintEventMap[K];
    };
}[CrossmintEvents];
