<script setup lang="ts">
import { ref } from "vue";

import type { CheckoutEventMap, CrossmintCheckoutEvent } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement } from "@crossmint/client-sdk-vue-ui";
import "@crossmint/client-sdk-vue-ui/dist/index.css";

const email = ref("");

function onEvent<K extends keyof CheckoutEventMap>(event: CrossmintCheckoutEvent<K>) {
    console.log("onEvent", event);
}
</script>

<template>
    <div class="container">
        <div class="form">
            <label for="email">
                Email
                <input type="email" name="email" v-model="email" />
            </label>
            <CrossmintPaymentElement
                environment="http://localhost:3000"
                clientId="db218e78-d042-4761-83af-3c4e5e6659dd"
                :recipient="{ email }"
                :on-event="onEvent"
            />
        </div>
    </div>
</template>

<style scoped>
.container {
    width: 100vw;
    height: 100vh;
}

.form {
    max-width: 500px;
    margin: 0 auto;
}
</style>
