---
"@crossmint/client-sdk-base": minor
---

payment-method-management: add `fields.billingDetails.address` and surface `card.billing` on the emitted card method.

- `fields?: { billingDetails?: { address?: boolean | { line2?: PaymentMethodBillingAddressLine2 } } }` — optional fields of the add-card form, in Stripe's `billingDetails` shape so new fields need no new prop. `address: true` requires a valid billing address before the card saves, for built-in and `ref.submit()` submissions alike. An object collects it too and configures address line 2: `"optional"` (default, same as `true`), `"required"`, or `"hidden"`. Applies to cards only.
- `CrossmintCardPaymentMethod.card.billing` — optional billing details (`name`, `address`, `phone`) the card was saved with, surfaced on `onPaymentMethodSelected` and `submit()` results via the new `CrossmintPaymentMethodBillingDetails` / `CrossmintPaymentMethodBillingAddress` types.

Requires the matching iframe release (Paella-Labs/crossbit-main#33078; the `line2` object form also needs Paella-Labs/crossbit-main#33171): the flag is a no-op until it is deployed.
