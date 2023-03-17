import { CrossmintPaymentElement } from "@/components";
import type { App } from "vue";

export default {
    install: (app: App) => {
        app.component("CrossmintPaymentElement", CrossmintPaymentElement);
    },
};

export { CrossmintPaymentElement };
