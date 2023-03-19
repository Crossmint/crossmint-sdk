<script setup lang="ts">
import { CrossmintPaymentElement } from "@crossmint/client-sdk-vue-ui";
import "@crossmint/client-sdk-vue-ui/dist/index.css";

function onEvent() {
    console.log("onEvent");
}
</script>

<template>
    <p>Hola</p>
    <CrossmintPaymentElement clientId="12345" :mint-args="{}" :on-event="onEvent" />
</template>

<style scoped></style>
