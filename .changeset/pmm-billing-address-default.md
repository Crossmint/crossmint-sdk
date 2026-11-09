---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

payment-method-management: behaviour change: the add-card form of `CrossmintPaymentMethodManagement` collects a billing address by default.

- `fields.billingDetails.address` now defaults to `true`. Issuers approve more cards that carry a billing address.
- A host that passes no `fields` (or `fields` without `billingDetails.address`) now shows the address form, and `onChange` reports `complete: false` until the buyer fills it in.
- Pass `fields: { billingDetails: { address: false } }` to keep the previous behaviour and save cards without a billing address.
- `defaultValues.billingDetails.address` now applies without `fields`, because the form collects an address by default.
