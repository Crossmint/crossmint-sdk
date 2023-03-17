<script setup lang="ts">
import type { Currency, Locale, PaymentMethod } from "@crossmint/client-sdk-base";

// TODO: Looks like you cannot import the interface directly from the package
// https://github.com/vuejs/core/issues/4294#issuecomment-970861525
export interface PaymentElement {
    clientId: string;
    mintArgs: Record<string, any>;
    recipient?: string;
    pamentMethod?: PaymentMethod;
    currency?: Currency;
    locale?: Locale;
    onEvent?: (event: string, metadata: Record<string, any>) => void;
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
