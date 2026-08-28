---
"@crossmint/wallets-sdk": patch
---

Reject passkey assertions returned by a custom `onSignWithPasskey` handler when the WebAuthn user verification flag is unset, since the on-chain verifier requires it and the bundler would reject the transaction with an opaque AA24 signature error.
