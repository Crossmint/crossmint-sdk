---
"@crossmint/client-sdk-base": minor
---

Expose `rules` in `PaymentMethodManagementAppearance` so consumers can override `PrimaryButton`, `Input`, and other element-level styles. The iframe runtime already accepts and merges `rules` correctly; this change removes the public type narrowing that was preventing TypeScript consumers from reaching the lever.
