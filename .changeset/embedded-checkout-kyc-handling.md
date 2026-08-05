---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Added `kycHandling` to embedded checkout. Setting it to `"external"` stops checkout from rendering the identity verification step, so a merchant can render `CrossmintIdentityVerification` in their own layout using `getIdentityVerificationCredentials(order)`.
