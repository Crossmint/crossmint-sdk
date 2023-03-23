<script setup lang="ts">
import { useCrossmintEvents } from "@crossmint/client-sdk-vue-ui";

const { listenToMintingEvents } = useCrossmintEvents({ environment: "http://localhost:3000" });
listenToMintingEvents({ orderIdentifier: "dab03499-76b9-4dd5-b702-2ea89940ec9c" }, (event) => {
    switch (event.type) {
        case "order:process.finished":
            console.log("Minting is done!", event.payload);
            break;
        case "transaction:fulfillment.succeeded":
            console.log("Transaction succeeded", event.payload);
            break;
        case "transaction:fulfillment.failed":
            console.log("Transaction failed", event.payload);
            break;
    }
});
</script>

<template>
    <div>
        <h1>Minting...</h1>
    </div>
</template>
