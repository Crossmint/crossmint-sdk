---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

`identityVerificationHandling` is now accepted by React Native embedded checkout, not web only. Setting it to `"external"` stops checkout from rendering the identity verification step, so you can render `CrossmintIdentityVerification` in your own screen using `getIdentityVerificationCredentials(order)`.
