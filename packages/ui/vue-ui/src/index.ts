import type { App } from "vue";

import type { CrossmintEvent, CrossmintEventMap, CrossmintEventUnion } from "@crossmint/client-sdk-base";
import { CrossmintEvents, useCrossmintEvents } from "@crossmint/client-sdk-base";

import { CrossmintPaymentElement } from "./components";

export default {
    install: (app: App) => {
        app.component("CrossmintPaymentElement", CrossmintPaymentElement);
    },
};

export { CrossmintPaymentElement, useCrossmintEvents, CrossmintEvents };
export type { CrossmintEvent, CrossmintEventMap, CrossmintEventUnion };
