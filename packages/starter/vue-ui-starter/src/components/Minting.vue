<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";

import { useCrossmintEvents } from "@crossmint/client-sdk-vue-ui";

const { listenToMintingEvents } = useCrossmintEvents({ environment: "http://localhost:3000" });
const route = useRoute();

const status = ref<string[]>([]);
const celebrate = ref(false);
const verificationUrl = ref("");

listenToMintingEvents({ orderIdentifier: route.query.orderIdentifier?.toString()! }, (event) => {
    switch (event.type) {
        case "order:process.finished":
            const orderFinishedPayload = event.payload;
            console.log("Minting is done!", event.payload);
            status.value.push("Minting is done!");
            if (orderFinishedPayload.verification.required) {
                verificationUrl.value = orderFinishedPayload.verification.url;
            } else {
                celebrate.value = true;
            }

            break;
        case "transaction:fulfillment.succeeded":
            console.log("Transaction succeeded", event.payload);
            const succeededTransactionPayload = event.payload;
            status.value.push(`Transaction ${succeededTransactionPayload.transactionIdentifier} succeeded`);
            break;
        case "transaction:fulfillment.failed":
            console.log("Transaction failed", event.payload);
            const failedTransactionPayload = event.payload;
            status.value.push(`Transaction ${failedTransactionPayload.transactionIdentifier} failed`);
            break;
        case "order:process.started":
            console.log("Minting started", event.payload);
            status.value.push("Minting started");
            break;
    }
});
</script>

<template>
    <div>
        <h1>Minting...</h1>
        Status:
        <ul>
            <li v-for="s in status" :key="s">{{ s }}</li>
        </ul>
        <img v-if="celebrate" src="https://media1.giphy.com/media/IwAZ6dvvvaTtdI8SD5/giphy.gif" alt="Celebrate!!" />
        <a v-if="verificationUrl" :href="verificationUrl">Verify your purchase</a>
    </div>
</template>
