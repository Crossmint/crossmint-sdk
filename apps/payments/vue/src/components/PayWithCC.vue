<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import type { CrossmintEvent } from "@crossmint/client-sdk-base";

const email = ref("");
const wallet = ref("");
const quantity = ref(1);

const itemEthPrice = 0.01;
const totalItemsEthPrice = itemEthPrice * quantity.value;
const totalFiatItemPrice = ref<string | number | null>(null);
const totalGasFee = ref<string | number | null>(null);
const currency = ref<string | null>(null);
const itemEthFee = 0.0001 * quantity.value;

const totalEthPrice = totalItemsEthPrice + itemEthFee;
const totalFiatPrice = ref<string | number | null>(null);

const isPaying = ref(true);

const router = useRouter();

function onEvent(event: CrossmintEvent) {
    switch (event.type) {
        case "quote:status.changed":
            const { totalPrice, lineItems } = event.payload;
            totalFiatItemPrice.value = lineItems[0].price.amount;
            totalFiatPrice.value = totalPrice.amount;
            currency.value = totalPrice.currency.toUpperCase();
            isPaying.value = false;
            totalGasFee.value = lineItems[0].gasFee?.amount ?? 0;
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
                    <p>~{{ currency }} {{ totalFiatItemPrice }}</p>
                </div>
            </div>

            <div class="price-container">
                <p>Mint fee x{{ quantity }}</p>
                <div class="price-value">
                    <p>{{ itemEthFee }}ETH</p>
                </div>
            </div>

            <div class="price-container">
                <p>Gas fee</p>
                <div class="price-value">
                    <p>~ {{ currency }} {{ totalGasFee }}</p>
                </div>
            </div>

            <div class="price-container">
                <p>Total</p>
                <div class="price-value">
                    <p>{{ totalEthPrice }} ETH</p>
                    <p>~{{ currency }} {{ totalFiatPrice }}</p>
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

            <iframe
                src="http://localhost:3000/checkout/embed"
                allow="payment *"
                style="border: none; width: 100%; height: 600px;"
            ></iframe>
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
