<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";

import type {
    CardWalletPaymentMethod,
    CaseInsensitive,
    CrossmintCheckoutEventUnion,
    Currency,
    EmailInputOptions,
    Locale,
    MintConfig,
    PaymentElementExperimentalOptions,
    PaymentMethod,
    Recipient,
    UIConfig,
} from "@crossmint/client-sdk-base";
import { crossmintPaymentService, crossmintUiService } from "@crossmint/client-sdk-base";

// TODO: Looks like you cannot import the interface directly from the package
// https://github.com/vuejs/core/issues/4294#issuecomment-970861525
export interface PaymentElement {
    projectId?: string;
    clientId?: string;
    collectionId?: string;
    mintConfig?: MintConfig;
    recipient?: Recipient;
    paymentMethod?: PaymentMethod;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    uiConfig?: UIConfig;
    environment?: string;
    whPassThroughArgs?: any;
    onEvent?(event: CrossmintCheckoutEventUnion): any;
    cardWalletPaymentMethods?: CardWalletPaymentMethod | CardWalletPaymentMethod[] | "none";
    emailInputOptions?: EmailInputOptions;
    experimental?: PaymentElementExperimentalOptions;
}

const props = withDefaults(defineProps<PaymentElement>(), {});

if (props.clientId && props.collectionId) {
    throw new Error("You cannot specify both clientId and collectionId. Please remove clientId.");
}

if (!props.clientId && !props.collectionId) {
    throw new Error("You must specify collectionId prop.");
}

const paymentServiceProps: any = {
    clientId: props.clientId || props.collectionId,
    projectId: props.projectId,
    environment: props.environment,
    uiConfig: props.uiConfig,
    recipient: props.recipient,
    mintConfig: props.mintConfig,
    whPassThroughArgs: props.whPassThroughArgs,
    cardWalletPaymentMethods: props.cardWalletPaymentMethods,
    emailInputOptions: props.emailInputOptions,
    experimental: props.experimental,
};

const { getIframeUrl, listenToEvents, emitQueryParams } = crossmintPaymentService(paymentServiceProps);
const { listenToEvents: listenToUiEvents } = crossmintUiService({ environment: props.environment });

const iframeUrl = getIframeUrl();

const styleHeight = ref(0);

const removeEventListener = listenToEvents((event) => props.onEvent?.(event.data));

const removeUIEventListener = listenToUiEvents((event: MessageEvent<any>) => {
    const { type, payload } = event.data;

    switch (type) {
        case "ui:height.changed":
            styleHeight.value = payload.height;
            break;
        default:
            return;
    }
});

onUnmounted(() => {
    removeEventListener();
    removeUIEventListener();
});

watch(
    () => [props.recipient, props.mintConfig, props.locale, props.whPassThroughArgs],
    () => {
        emitQueryParams({
            recipient: props.recipient,
            mintConfig: props.mintConfig,
            locale: props.locale,
            whPassThroughArgs: props.whPassThroughArgs,
        });
    },
    { deep: true }
);
</script>

<template>
    <iframe
        :src="iframeUrl"
        allow="payment *"
        id="iframe-crossmint-payment-element"
        :style="{ height: `${styleHeight}px` }"
    ></iframe>
</template>

<style scoped>
iframe {
    border: none !important;
    padding: 0px !important;
    width: 100% !important;
    min-width: 100% !important;
    overflow: hidden !important;
    display: block !important;
    user-select: none !important;
    transform: translate(0px) !important;
    opacity: 1;
    transition: ease 0s, opacity 0.4s ease 0.1s;
}
</style>
