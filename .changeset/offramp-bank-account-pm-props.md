---
"@crossmint/client-sdk-base": minor
---

payment-method-management: add `mode` and `allowedPaymentMethodTypes` props and a `bank-account-us` return variant.

- `mode?: "new-only" | "new-and-existing"` (default `new-and-existing`).
- `allowedPaymentMethodTypes?: ("card" | "bank-account-us")[]` (default `["card"]`).
- `CrossmintPaymentMethod` is now a discriminated union on `type`. The new `bank-account-us` variant carries only a safe display summary (`paymentMethodId` + `bankAccount: { accountSuffix, bankName, accountType }`); no token id or raw account number.

Type-breaking for consumers of `onPaymentMethodSelected`: a payment method must now be narrowed on `type` before reading variant-specific fields (e.g. `pm.card` is only valid after `pm.type === "card"`). Existing card-only integrations that already narrow, or that do not read variant fields, are unaffected.
