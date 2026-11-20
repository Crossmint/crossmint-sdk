---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-native-ui": minor
---

Embedded offramp: add optional `payer.signMessage`. When a withdrawal needs proof that the user owns the payer wallet, the offramp asks the payer to sign a Crossmint challenge and continues. Without it the user is told the wallet must be verified first. Adds the `verifying-wallet` status. Needs the matching iframe release.
