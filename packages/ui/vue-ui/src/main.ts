import type { App } from "vue";

import type { CrossmintCheckoutEvent } from "@crossmint/client-sdk-base";
import { CheckoutEvents, useCrossmintEvents } from "@crossmint/client-sdk-base";

import { CrossmintPaymentElement } from "./components";

export default {
    install: (app: App) => {
        app.component("CrossmintPaymentElement", CrossmintPaymentElement);
    },
};

export { CrossmintPaymentElement, useCrossmintEvents, CheckoutEvents };
export type { CrossmintCheckoutEvent };
