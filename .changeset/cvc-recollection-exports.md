---
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-base": patch
---

Export `CrossmintCvcRecollectionProps`, `CvcRecollectionError` and `PaymentMethodManagementAppearance` from `@crossmint/client-sdk-react-ui`, and document when to render `CrossmintCvcRecollection` (rail `pending_cvc_recollection` or mint-time 409 `ORDER_INTENT_CVC_RECOLLECTION_REQUIRED`), the `retriable` contract of its errors, and that its appearance `fontSizeUnit`/`spacingUnit` are multiplier units unlike `VerificationAppearance`.
