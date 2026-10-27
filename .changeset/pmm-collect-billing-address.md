---
"@crossmint/client-sdk-base": minor
---

payment-method-management: add `collectBillingAddress` and surface `card.billing` on the emitted card method.

- `collectBillingAddress?: boolean` (default `false`) — when enabled, the "add new" card form requires a valid billing address before it saves, for built-in and `ref.submit()` submissions alike. Applies to cards only.
- `CrossmintCardPaymentMethod.card.billing` — optional billing details (`name`, `address`, `phone`) the card was saved with, surfaced on `onPaymentMethodSelected` and `submit()` results via the new `CrossmintPaymentMethodBillingDetails` / `CrossmintPaymentMethodBillingAddress` types.

Requires the matching iframe release (Paella-Labs/crossbit-main#33078): the flag is a no-op until it is deployed.
