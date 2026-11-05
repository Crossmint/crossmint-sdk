---
"@crossmint/client-sdk-base": minor
---

payment-method-management: add `defaultValues.billingDetails.address`, the starting values of the add-card billing address.

- `defaultValues?: { billingDetails?: { address?: { country?, line1?, line2?, city?, stateOrRegion?, postalCode? } } }` — same `billingDetails` shape as `fields`, with the field names of `card.billing.address`. The buyer can edit every value. `null` or an empty string means no default for that field. The form uses them only when `fields.billingDetails.address` collects an address.
- The iframe validates each value: it ignores an invalid value with a console warning and keeps the others. `country` must be an uppercase ISO 3166-1 alpha-2 code; without it, the form starts in the US. `stateOrRegion` must be an exact ISO 3166-2 subdivision code of that country, without the country prefix: `"FL"`, not `"US-FL"` or `"Florida"`.
- Like Stripe.js, the SDK throws when `defaultValues`, `billingDetails` or `address` is not an object (an array, a string), or when an address field is not a string or `null`. `null` at any level means no default. Class instances pass. The SDK logs a warning for an unknown key and drops the key, so only known keys reach the iframe URL.
- The values travel in the iframe URL. A change after mount reloads the iframe, so pass stable values.
