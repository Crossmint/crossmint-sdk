---
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-native-ui": minor
---

Added a `useIdentityVerificationCredentials` hook, so a merchant taking the identity verification step over with `identityVerificationHandling="external"` reads the credentials in one line instead of plumbing the order through `getIdentityVerificationCredentials`. The plain function stays exported for orders that do not come from checkout context.
