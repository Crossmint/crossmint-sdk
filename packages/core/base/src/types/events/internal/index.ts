import { CrossmintInternalEvents } from "./events";
import { CrossmintInternalEventMap } from "./payloads";

export * from "./events";
export * from "./payloads";

export type CrossmintInternalEvent = {
    [K in CrossmintInternalEvents]: {
        type: K;
        payload: CrossmintInternalEventMap[K];
    };
}[CrossmintInternalEvents];
