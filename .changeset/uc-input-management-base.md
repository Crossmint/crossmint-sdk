---
"@crossmint/client-sdk-base": minor
---

Add `createProtectedInputsApi` (`list`, `get`, `revoke` on `/api/unstable/protected-inputs`, metadata only) and `cancelOrderIntent` on `createOrderIntentsApi` (`DELETE /api/unstable/order-intents/{id}`), so an app can revoke a merchant-site password or cancel a card authorization it handed to Universal Checkout. Both clients now share `UnstableApiError` as the base of their error classes. `CreateOrderIntentRequest.merchant` is documented as optional for Agent Checkouts.
