---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Added `identityVerificationHandling` to embedded checkout on web. Setting it to `"external"` stops checkout from rendering the identity verification step, so a merchant can render `CrossmintIdentityVerification` in their own layout using `getIdentityVerificationCredentials(order)`.

Requires a Crossmint deployment that understands the flag. Against an older one it is ignored, and checkout renders the verification step alongside the merchant's, both against the same inquiry.
