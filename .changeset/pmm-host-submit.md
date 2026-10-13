---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintPaymentMethodManagement` can be submitted from your own button.

- New `ref`: `ref.current.submit()` resolves with `PaymentMethodSubmitResult`: `selected` or `saved` with the payment method, `invalid` (the component shows the field error), `failed` (retryable, with a message) or `unavailable` (the component is not ready or did not answer). It never rejects. A call while one is in flight returns the same promise.
- New `hideSubmitButton` prop (default `false`): the component renders no Save/Continue button. Nothing changes for hosts that do not pass it; `onPaymentMethodSelected` keeps firing on every save or selection, including those started by `submit()`.
- `@crossmint/client-sdk-react-ui` now exports `CrossmintPaymentMethodManagementProps`, `CrossmintPaymentMethodManagementRef`, `CrossmintPaymentMethod` and `PaymentMethodSubmitResult`.
