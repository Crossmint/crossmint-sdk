<script setup lang="ts">
import { watch } from "vue";

import type {
    CheckoutEventMap,
    Currency,
    Locale,
    PaymentMethod,
    Recipient,
    UIConfig,
} from "@crossmint/client-sdk-base";
import { crossmintPaymentService } from "@crossmint/client-sdk-base";

// TODO: Looks like you cannot import the interface directly from the package
// https://github.com/vuejs/core/issues/4294#issuecomment-970861525
export interface PaymentElement {
    clientId: string;
    mintArgs?: Record<string, any>;
    recipient?: Recipient;
    paymentMethod?: PaymentMethod;
    currency?: Currency;
    locale?: Locale;
    uiConfig?: UIConfig;
    environment?: string;
    onEvent?<K extends keyof CheckoutEventMap>(event: K, payload: CheckoutEventMap[K]): any;
}

const props = withDefaults(defineProps<PaymentElement>(), {});

const { getIframeUrl, listenToEvents, emitRecipient } = crossmintPaymentService(props);

const iframeUrl = getIframeUrl();

listenToEvents((event: any) => {
    props.onEvent?.(event.type, event.payload);
});

watch(
    () => props.recipient,
    () => {
        emitRecipient(props.recipient);
    },
    { deep: true }
);
</script>

<template>
    <iframe :src="iframeUrl" id="iframe-crossmint-payment-element"></iframe>
</template>

<style scoped>
iframe {
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
}
</style>
