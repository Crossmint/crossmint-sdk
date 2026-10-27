---
"@crossmint/client-sdk-base": major
"@crossmint/client-sdk-react-ui": major
---

BREAKING: `CrossmintPaymentMethodManagement` no longer renders a built-in submit button. The `hideSubmitButton` prop is removed — the component always asks the host to submit via `ref.submit()`, which must be wired to your own button.
