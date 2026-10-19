---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

`CrossmintCvcRecollection` can be submitted from your own button.

- New `ref`: `ref.current.submit()` resolves with `CvcRecollectionSubmitResult`: `complete` (the new CVC was stored; `onComplete` also fired), `invalid` (the component shows the field error), `failed` (retryable, with a message), `refused` (terminal, with the same `reason`/`message` `onError` reported) or `unavailable` (the component is not ready or did not answer). It never rejects. A call while one is in flight returns the same promise; after `complete`, submitting again returns `complete` without updating the vault twice.
- New `hideSubmitButton` prop (default `false`): the component renders no Confirm button. Nothing changes for hosts that do not pass it; `onComplete` and `onError` keep firing, including for submits started by `submit()`.
- `@crossmint/client-sdk-react-ui` now exports `CrossmintCvcRecollectionRef` and `CvcRecollectionSubmitResult`.

Pending submits resolve as `superseded` when the card, iframe configuration, or connection changes, or the component unmounts. The connection and handshake start on mount — so `submit()` also works if the iframe `load` event was missed (SSR/hydration) — and each later iframe reload establishes a fresh handshake before submitting. An iframe result with an unrecognized status resolves as `failed` instead of hanging until the timeout. Superseding a submit does not cancel an update already started on the server; after a timeout the update may still have completed, `onComplete` fires if it did, and submitting again returns the outcome.

Requires the updated `/sdk/unstable/cvc-recollection` iframe (crossbit-main); against an older frame `submit()` resolves `unavailable` after the timeout.
