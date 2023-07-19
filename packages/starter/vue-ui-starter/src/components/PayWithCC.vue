<script setup lang="ts">
import { ref } from "vue";

import type { CheckoutEventMap, CrossmintCheckoutEvent, CrossmintCheckoutEventUnion } from "@crossmint/client-sdk-base";
import { CrossmintPaymentElement } from "@crossmint/client-sdk-vue-ui";
import "@crossmint/client-sdk-vue-ui/dist/index.css";

import { router } from "../main";

const email = ref("");
const wallet = ref("");
const quantity = ref(1);

const itemEthPrice = 0.01;
const totalItemsEthPrice = itemEthPrice * quantity.value;
const totalFiatItemPrice = ref<string | number | null>(null);

const itemEthFee = 0.0001 * quantity.value;

const totalEthPrice = totalItemsEthPrice + itemEthFee;
const totalFiatPrice = ref<string | number | null>(null);

const isPaying = ref(true);

function onEvent(event: CrossmintCheckoutEventUnion) {
    switch (event.type) {
        case "quote:status.changed":
            const { totalPrice, lineItems } = event.payload;
            totalFiatItemPrice.value = lineItems[0].price.amount;
            totalFiatPrice.value = totalPrice.amount;
            isPaying.value = false;
            break;
        case "payment:process.started":
            isPaying.value = true;
            break;
        case "payment:process.succeeded":
            const { orderIdentifier } = event.payload;
            router.push(`/minting?orderIdentifier=${orderIdentifier}`);
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
                collection-id="6845c702-8396-4339-b17e-a2bf12d2cf6d"
                project-id="a3d161dd-43c8-4ba9-b7c0-a54515bf61d8"
                :mint-config="{ totalPrice: String(0.001 * quantity), quantity: String(quantity) }"
                :recipient="{
                    email,
                    ...(wallet
                        ? {
                              wallet,
                          }
                        : {}),
                }"
                @event="onEvent"
            />
        </div>
    </div>
</template>

<style scoped>
.container {
    width: 100%;
    height: 100%;
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
