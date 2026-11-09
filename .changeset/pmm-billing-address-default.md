---
"@crossmint/client-sdk-base": minor
---

payment-method-management: the add-card form collects a billing address by default.

- `fields.billingDetails.address` now defaults to `true`. Issuers approve more cards that carry a billing address.
- Pass `fields: { billingDetails: { address: false } }` to keep the previous behaviour and save cards without a billing address.
- `defaultValues.billingDetails.address` now applies without `fields`, because the form collects an address by default.
