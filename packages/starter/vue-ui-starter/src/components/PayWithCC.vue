<script setup lang="ts">
import { ref } from "vue";

import { CheckoutEvents } from "@crossmint/client-sdk-base";
import type { CheckoutEventMap, CrossmintCheckoutEvent } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement } from "@crossmint/client-sdk-vue-ui";
import "@crossmint/client-sdk-vue-ui/dist/index.css";

import { router } from "../main";

const email = ref("");
const wallet = ref("");
const quantity = ref(1);

const itemEthPrice = 0.01;
const totalItemsEthPrice = itemEthPrice * quantity.value;
const totalFiatItemPrice = ref(null);

const itemEthFee = 0.0001 * quantity.value;
const totalCrossmintFees = ref(null);

const totalEthPrice = totalItemsEthPrice + itemEthFee;
const totalFiatPrice = ref(null);

const isPaying = ref(true);

function onEvent<K extends keyof CheckoutEventMap>(event: CrossmintCheckoutEvent<K>) {
    switch (event.type) {
        case CheckoutEvents.PAYMENT_READY:
            totalFiatItemPrice.value = (event.payload as any).totalQuote.priceBreakdown.unitPrice.amount;
            totalCrossmintFees.value = (event.payload as any).totalQuote.priceBreakdown.totalCrossmintFees.amount;
            totalFiatPrice.value = (event.payload as any).totalQuote.totalPrice.amount;
            isPaying.value = false;
            break;
        case CheckoutEvents.PAYMENT_STARTED:
            isPaying.value = true;
            break;
        case CheckoutEvents.PAYMENT_COMPLETED:
            // GO TO MINTING PAGE
            router.push("/minting");
            break;
        default:
            break;
    }
}
</script>

<template>
    <div class="container">
        <h1 v-if="isPaying">LOADING...</h1>
        <div class="form">
            <div className="form-item-container">
                <label for="quantity">
                    Quantity
                    <input type="number" name="quantity" v-model="quantity" />
                </label>
            </div>

            <h3>Price breakdown</h3>
            <div class="price-container">
                <p>{{ itemEthPrice }} ETH x{{ quantity }}</p>
                <div class="price-value">
                    <p>{{ totalItemsEthPrice }}ETH</p>
                    <p>~${{ totalFiatItemPrice }}</p>
                </div>
            </div>

            <div class="price-container">
                <p>Mint fee x{{ quantity }}</p>
                <div class="price-value">
                    <p>{{ itemEthFee }}ETH</p>
                    <p>~${{ totalCrossmintFees }}</p>
                </div>
            </div>

            <div class="price-container">
                <p>Total</p>
                <div class="price-value">
                    <p>{{ totalEthPrice }} ETH</p>
                    <p>~${{ totalFiatPrice }}</p>
                </div>
            </div>

            <div className="form-item-container">
                <label for="email">
                    Email
                    <input type="email" name="email" v-model="email" />
                </label>
            </div>

            <div className="form-item-container">
                <label for="wallet">
                    Recipient address
                    <input type="text" name="wallet" v-model="wallet" />
                </label>
            </div>

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

.form-item-container {
    margin-bottom: 10px;
}

.form-item-container label {
    display: block;
}

.price-container {
    display: flex;
    justify-content: space-between;
}

.price-value {
    text-align: right;
}
</style>
