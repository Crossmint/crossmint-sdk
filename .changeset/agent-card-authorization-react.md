---
"@crossmint/client-sdk-react-ui": minor
---

Add `CrossmintAgentCardAuthorization`. It composes `CrossmintPaymentMethodManagement` (cards only), order-intent registration, order-intent creation and `OrderIntentVerification` into one component that calls `onAuthorized` with the `orderIntentId` to hand to Universal Checkout. The rail is chosen by a fixed policy (`agentic-token`/`vic` with a card credential format, then `agentic-token`/`agentpay`, then `encrypted-card`); `onError` reports a closed set of codes. Card numbers, CVCs and vault token ids never reach the callbacks.
