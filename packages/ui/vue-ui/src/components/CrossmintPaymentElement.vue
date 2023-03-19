<script setup lang="ts">
import type {
    CheckoutEventMap,
    Currency,
    Locale,
    PaymentMethod,
    Recipient,
    UIConfig,
} from "@crossmint/client-sdk-base";

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
    onEvent?<K extends keyof CheckoutEventMap>(event: K, payload: CheckoutEventMap[K]): this;
}

const props = withDefaults(defineProps<PaymentElement>(), {});
console.log(props);
</script>

<template>
    <p>Hola!!!!!! {{ JSON.stringify(props) }}</p>
</template>

<style scoped>
p {
    color: red;
}
</style>
