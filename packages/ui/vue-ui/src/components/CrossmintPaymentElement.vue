<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";

import type { FiatPaymentElementProps } from "@crossmint/client-sdk-base";
import { crossmintPaymentService, crossmintUiService } from "@crossmint/client-sdk-base";

const props = withDefaults(defineProps<FiatPaymentElementProps>(), {});

function assertClientIdentifier(props: object) {
    function hasClientId(props: any): props is FiatPaymentElementProps & {
        clientId: string;
    } {
        return "clientId" in props && props.clientId;
    }
    function hasCollectionId(props: any): props is FiatPaymentElementProps & {
        collectionId: string;
    } {
        return "collectionId" in props && props.collectionId;
    }

    if (hasClientId(props) && hasCollectionId(props)) {
        throw new Error("You cannot specify both clientId and collectionId. Please remove clientId.");
    }

    let clientIdentifier: string | undefined;
    if (hasClientId(props)) {
        clientIdentifier = props.clientId;
    } else if (hasCollectionId(props)) {
        clientIdentifier = props.collectionId;
    }

    if (!clientIdentifier) {
        throw new Error("You must specify collectionId prop.");
    }

    return clientIdentifier;
}

const paymentServiceProps: Parameters<typeof crossmintPaymentService>[0] = {
    clientId: assertClientIdentifier(props),
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
