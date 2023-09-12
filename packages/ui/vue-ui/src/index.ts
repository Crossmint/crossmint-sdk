import type { App } from "vue";

import type {
    CrossmintPublicEvent,
    CrossmintPublicEventMap,
    CrossmintPublicEventUnion,
} from "@crossmint/client-sdk-base";
import { CrossmintPublicEvents, useCrossmintEvents } from "@crossmint/client-sdk-base";

import { CrossmintPaymentElement } from "./components";

export default {
    install: (app: App) => {
        app.component("CrossmintPaymentElement", CrossmintPaymentElement);
    },
};

export { CrossmintPaymentElement, useCrossmintEvents, CrossmintPublicEvents };
export type { CrossmintPublicEvent, CrossmintPublicEventMap, CrossmintPublicEventUnion };
