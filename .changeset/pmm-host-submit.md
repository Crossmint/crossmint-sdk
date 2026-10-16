---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintPaymentMethodManagement` can be submitted from your own button.

- New `ref`: `ref.current.submit()` resolves with `PaymentMethodSubmitResult`: `selected` or `saved` with the payment method, `invalid` (the component shows the field error), `failed` (retryable, with a message) or `unavailable` (the component is not ready or did not answer). It never rejects. A call while one is in flight returns the same promise.
- New `hideSubmitButton` prop (default `false`): the component renders no Save/Continue button. Nothing changes for hosts that do not pass it; `onPaymentMethodSelected` keeps firing on every save or selection, including those started by `submit()`.
- `@crossmint/client-sdk-react-ui` now exports `CrossmintPaymentMethodManagementProps`, `CrossmintPaymentMethodManagementRef`, `CrossmintPaymentMethod` and `PaymentMethodSubmitResult`.

Pending submits resolve as `superseded` when the buyer, iframe configuration, or connection changes, or the component unmounts. The connection and handshake start on mount — so `submit()` also works if the iframe `load` event was missed (SSR/hydration) — and each later iframe reload establishes a fresh handshake before submitting. An iframe result with an unrecognized status resolves as `failed` instead of hanging until the timeout. Superseding a submit does not cancel a save already started on the server; after a timeout the save may still have completed, `onPaymentMethodSelected` fires if it did, and submitting again returns the same method.
