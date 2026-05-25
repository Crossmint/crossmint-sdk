---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintPaymentMethodManagement`: add `mode` (`"select-or-add" | "add-only"`) and `allowedPaymentMethodTypes` props. Make `jwt` optional — when omitted, the component tokenizes the card without persisting a saved payment method and emits a `card-token` selection event.

Introduces `CrossmintNewCard`, a tokenize-only wrapper around `CrossmintPaymentMethodManagement` for use cases that don't need a signed-in user (e.g., embedded checkout).

The `onPaymentMethodSelected` callback now receives a discriminated union: `{ type: "card", paymentMethod }` when a saved method is selected/created, or `{ type: "card-token", cardToken }` when tokenizing without JWT.
