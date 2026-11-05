---
"@crossmint/client-sdk-base": minor
---

payment-method-management: add `defaultValues.billingDetails.address`, the starting values of the add-card billing address.

- `defaultValues?: { billingDetails?: { address?: { country?, line1?, line2?, city?, stateOrRegion?, postalCode? } } }` — same `billingDetails` shape as `fields`, with the field names of `card.billing.address`. The buyer can edit every value. `null` or an empty string means no default for that field. The form uses them only when `fields.billingDetails.address` collects an address.
- The iframe validates each value: it ignores an invalid value with a console warning and keeps the others. `country` must be an uppercase ISO 3166-1 alpha-2 code.
- Like Stripe.js, the SDK throws when `defaultValues`, `billingDetails` or `address` is not a plain object, or when an address field is not a string or `null`. It logs a warning for an unknown key and passes the key through.
- The values travel in the iframe URL. A change after mount reloads the iframe, so pass stable values.
